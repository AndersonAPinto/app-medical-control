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
            importance: Notifications.AndroidImportance.DEFAULT,
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
