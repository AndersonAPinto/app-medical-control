import { useEffect } from "react";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { Platform } from "react-native";

// Closes the in-app browser after Google redirects back to the app.
// Must be called at module level so it runs before any hook.
WebBrowser.maybeCompleteAuthSession();

// On Android standalone builds (EAS), the redirect URI must use the app scheme.
// On web it uses the current origin. iOS uses the bundle identifier reverse-domain.
const redirectUri = makeRedirectUri(
  Platform.OS === "web"
    ? {}
    : { scheme: "medcontrol", path: "oauth2redirect/google" }
);

export type GoogleAuthResult =
  | { success: true; accessToken: string | null; idToken: string | null }
  | { success: false; error: string };

export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    // iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    scopes: ["openid", "profile", "email"],
    redirectUri,
  });

  useEffect(() => {
    if (__DEV__) {
      console.log("[GoogleAuth] redirectUri →", redirectUri);
      if (request?.redirectUri) {
        console.log("[GoogleAuth] request.redirectUri →", request.redirectUri);
      }
    }
  }, [request?.redirectUri]);

  useEffect(() => {
    if (!response) return;
    if (__DEV__) {
      console.log("[GoogleAuth] response.type →", response.type);
      if (response.type === "success") {
        console.log("[GoogleAuth] authentication →", response.authentication);
        console.log("[GoogleAuth] params →", response.params);
      }
      if (response.type === "error") {
        console.warn("[GoogleAuth] error →", response.error);
      }
    }
  }, [response]);

  // Resolve the id_token regardless of the flow:
  //   native (Code+PKCE) → authentication.idToken (auto-exchanged by library)
  //   web  (implicit)    → params.id_token
  const idToken =
    response?.type === "success"
      ? (response.authentication?.idToken ?? response.params?.id_token ?? null)
      : null;

  const accessToken =
    response?.type === "success"
      ? (response.authentication?.accessToken ?? response.params?.access_token ?? null)
      : null;

  async function signInWithGoogle(): Promise<GoogleAuthResult> {
    try {
      const result = await promptAsync();

      if (result.type === "cancel" || result.type === "dismiss") {
        return { success: false, error: "cancelled" };
      }

      if (result.type === "error") {
        const msg = result.error?.message ?? "Erro OAuth desconhecido";
        console.warn("[GoogleAuth] signInWithGoogle error:", result.error);
        return { success: false, error: msg };
      }

      if (result.type !== "success") {
        return { success: false, error: `Resposta inesperada: ${result.type}` };
      }

      const resolvedIdToken =
        result.authentication?.idToken ?? result.params?.id_token ?? null;
      const resolvedAccessToken =
        result.authentication?.accessToken ?? result.params?.access_token ?? null;

      if (!resolvedIdToken && !resolvedAccessToken) {
        console.warn("[GoogleAuth] success but no tokens found:", result);
        return { success: false, error: "Nenhum token retornado pelo Google" };
      }

      if (__DEV__) {
        console.log("[GoogleAuth] signInWithGoogle success ✓");
      }

      return { success: true, accessToken: resolvedAccessToken, idToken: resolvedIdToken };
    } catch (err: any) {
      console.error("[GoogleAuth] signInWithGoogle threw:", err);
      return { success: false, error: err?.message ?? "Erro inesperado" };
    }
  }

  return { request, response, promptAsync, idToken, accessToken, signInWithGoogle };
}
