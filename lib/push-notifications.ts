import Constants from "expo-constants";
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

function getProjectId(): string | undefined {
    return (
        Constants.expoConfig?.extra?.eas?.projectId ||
        Constants.easConfig?.projectId ||
        undefined
    );
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
    try {
        const settings = await Notifications.getPermissionsAsync();
        let finalStatus = settings.status;

        if (finalStatus !== "granted") {
            const requested = await Notifications.requestPermissionsAsync();
            finalStatus = requested.status;
        }

        if (finalStatus !== "granted") {
            return null;
        }

        await Notifications.setNotificationChannelAsync("default", {
            name: "Default",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#0D9488",
        });

        const tokenResult = await Notifications.getExpoPushTokenAsync({
            projectId: getProjectId(),
        });

        return tokenResult.data || null;
    } catch (error) {
        console.error("Push registration failed:", error);
        return null;
    }
}

export async function scheduleNextDoseNotification(
    medicationId: string,
    medicationName: string,
    triggerTimeMillis: number
): Promise<string | null> {
    try {
        const settings = await Notifications.getPermissionsAsync();
        if (settings.status !== "granted") {
            return null;
        }

        const date = new Date(triggerTimeMillis);

        // Schedule only if the date is in the future
        if (date.getTime() <= Date.now()) {
            return null;
        }

        const identifier = await Notifications.scheduleNotificationAsync({
            content: {
                title: "Hora do Medicamento",
                body: `Está na hora do remédio ${medicationName}.`,
                data: { type: "DOSE_DUE", relatedId: medicationId, medicationId },
                sound: true,
                priority: Notifications.AndroidNotificationPriority.MAX,
            },
            trigger: date,
        });
        
        return identifier;
    } catch (error) {
        console.error("Failed to schedule local notification:", error);
        return null;
    }
}

export async function cancelMedicationNotifications(medicationId: string): Promise<void> {
    try {
        const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
        const toCancel = scheduledNotifications.filter(
            (notification) => notification.content.data?.medicationId === medicationId
        );

        for (const notification of toCancel) {
            await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
    } catch (error) {
        console.error("Failed to cancel local notifications:", error);
    }
}
