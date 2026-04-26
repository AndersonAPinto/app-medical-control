import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";

// Required to complete the auth session on mobile after the browser redirects back
WebBrowser.maybeCompleteAuthSession();

export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    // Must be a Web application OAuth Client ID from Google Cloud Console
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
  });

  return { request, response, promptAsync };
}
