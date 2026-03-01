import { storage } from "../storage";
import { sendPushToUsers } from "./push";

const CHECK_INTERVAL_MS = 60 * 1000;
const MISSED_GRACE_MS = 60 * 60 * 1000;

let monitorHandle: ReturnType<typeof setInterval> | null = null;

function getDueTime(lastTakenMillis: number, intervalInHours: number): number {
    return lastTakenMillis + intervalInHours * 60 * 60 * 1000;
}

async function getMastersAndControllersForDependent(dependentId: string): Promise<string[]> {
    const conns = await storage.getConnectionsByDependent(dependentId);
    const acceptedMasterIds = conns.filter((conn) => conn.status === "ACCEPTED").map((conn) => conn.masterId);
    const recipients = new Set<string>(acceptedMasterIds);

    for (const masterId of acceptedMasterIds) {
        const masterConns = await storage.getConnectionsByMaster(masterId);
        const accepted = masterConns.filter((conn) => conn.status === "ACCEPTED");

        for (const conn of accepted) {
            const linkedUser = await storage.getUserById(conn.dependentId);
            if (linkedUser?.role === "CONTROLLER") {
                recipients.add(linkedUser.id);
            }
        }
    }

    return Array.from(recipients);
}

async function processMedicationCycle(medicationId: string): Promise<void> {
    const medication = await storage.getMedicationById(medicationId);
    if (!medication) return;

    const schedules = await storage.getSchedulesByOwner(medication.ownerId);
    const medSchedules = schedules
        .filter((schedule) => schedule.medId === medication.id)
        .sort((a, b) => b.timeMillis - a.timeMillis);

    const lastTaken = medSchedules.find((schedule) => schedule.status === "TAKEN");
    if (!lastTaken) return;

    const now = Date.now();
    const dueTime = getDueTime(lastTaken.timeMillis, medication.intervalInHours);
    if (dueTime > now) return;

    const duePending = medSchedules.find((schedule) => schedule.status === "PENDING" && schedule.timeMillis === dueTime);
    const dueMissed = medSchedules.find((schedule) => schedule.status === "MISSED" && schedule.timeMillis === dueTime);

    if (!duePending && !dueMissed) {
        await storage.createSchedule({
            medId: medication.id,
            timeMillis: dueTime,
            status: "PENDING",
            confirmedAt: null,
            ownerId: medication.ownerId,
        });

        await storage.createNotification({
            userId: medication.ownerId,
            type: "DOSE_DUE",
            title: "Hora do medicamento",
            message: `Está na hora do remédio ${medication.name}.`,
            relatedId: medication.id,
        });

        await sendPushToUsers([medication.ownerId], {
            title: "Hora do medicamento",
            body: `Está na hora do remédio ${medication.name}.`,
            data: { type: "DOSE_DUE", relatedId: medication.id },
        });
        return;
    }

    if (!duePending) return;
    if (now < dueTime + MISSED_GRACE_MS) return;

    await storage.updateScheduleStatus(duePending.id, "MISSED");

    const dependent = await storage.getUserById(medication.ownerId);
    if (!dependent || dependent.role !== "DEPENDENT") return;

    const recipients = await getMastersAndControllersForDependent(dependent.id);
    if (recipients.length === 0) return;

    const title = "Dose em atraso";
    const message = `${dependent.name}: dose de ${medication.name} em atraso.`;

    await Promise.all(
        recipients.map((userId) =>
            storage.createNotification({
                userId,
                type: "DOSE_MISSED",
                title,
                message,
                relatedId: medication.id,
            })
        )
    );

    await sendPushToUsers(recipients, {
        title,
        body: message,
        data: { type: "DOSE_MISSED", relatedId: medication.id, dependentId: dependent.id },
    });
}

async function runDoseMonitorCycle(): Promise<void> {
    const meds = await storage.getAllMedications();
    for (const med of meds) {
        try {
            await processMedicationCycle(med.id);
        } catch (error) {
            console.error("Dose monitor medication cycle error:", med.id, error);
        }
    }
}

export function startDoseMonitor(): void {
    if (monitorHandle) return;

    runDoseMonitorCycle().catch((error) => {
        console.error("Dose monitor initial cycle error:", error);
    });

    monitorHandle = setInterval(() => {
        runDoseMonitorCycle().catch((error) => {
            console.error("Dose monitor recurring cycle error:", error);
        });
    }, CHECK_INTERVAL_MS);
}
