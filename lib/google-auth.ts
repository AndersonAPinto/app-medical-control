import { GoogleSignin } from "@react-native-google-signin/google-signin";

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
  offlineAccess: true,
});

export async function signInWithGoogle(): Promise<string | null> {
  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();
    return response.data?.idToken ?? null;
  } catch (error) {
    console.error("Erro ao fazer sign in com Google:", error);
    return null;
  }
}

export async function signOutGoogle(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch (error) {
    console.error("Erro ao fazer sign out:", error);
  }
}
