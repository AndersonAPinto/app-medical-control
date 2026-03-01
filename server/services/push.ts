import { storage } from "../storage";

interface PushPayload {
    title: string;
    body: string;
    data?: Record<string, unknown>;
}

interface ExpoMessage {
    to: string;
    sound: "default";
    title: string;
    body: string;
    data?: Record<string, unknown>;
}

interface ExpoPushResponseItem {
    status: "ok" | "error";
    id?: string;
    message?: string;
    details?: {
        error?: string;
    };
}

function isExpoToken(token: string): boolean {
    return token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken[");
}

export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
    if (userIds.length === 0) return;

    const uniqueUserIds = Array.from(new Set(userIds));
    const tokenLists = await Promise.all(uniqueUserIds.map((userId) => storage.getPushTokensByUser(userId)));
    const tokens = tokenLists.flat().map((entry) => entry.token).filter(isExpoToken);

    if (tokens.length === 0) return;

    const messages: ExpoMessage[] = tokens.map((token) => ({
        to: token,
        sound: "default",
        title: payload.title,
        body: payload.body,
        data: payload.data,
    }));

    try {
        const response = await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify(messages),
        });

        if (!response.ok) {
            const raw = await response.text();
            console.error("Expo push send failed:", response.status, raw);
            return;
        }

        const result = (await response.json()) as { data?: ExpoPushResponseItem[] };
        const items = result.data || [];

        await Promise.all(
            items.map(async (item, index) => {
                if (item.status !== "error") return;
                const errorCode = item.details?.error;
                const token = messages[index]?.to;
                if (!token) return;

                if (errorCode === "DeviceNotRegistered") {
                    await storage.deletePushToken(token);
                    return;
                }

                console.error("Expo push item error:", item.message || errorCode || "Unknown error", { token });
            })
        );
    } catch (error) {
        console.error("Expo push send exception:", error);
    }
}
