import { fetch } from "expo/fetch";
import { QueryClient, QueryFunction } from "@tanstack/react-query";

/**
 * Gets the base URL for the Express API server (e.g., "http://localhost:3000")
 * @returns {string} The API base URL
 */
export function getApiUrl(): string {
  const explicitApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (explicitApiUrl) {
    const normalized = /^https?:\/\//.test(explicitApiUrl)
      ? explicitApiUrl
      : `https://${explicitApiUrl}`;
    return new URL(normalized).href;
  }

  const legacyDomain = process.env.EXPO_PUBLIC_DOMAIN?.trim();
  if (legacyDomain) {
    return new URL(`https://${legacyDomain}`).href;
  }

  throw new Error(
    "Set EXPO_PUBLIC_API_URL (preferred) or EXPO_PUBLIC_DOMAIN",
  );
}

function toFriendlyErrorMessage(raw: string, status: number): string {
  const msg = raw.trim().toLowerCase();

  if (msg.includes("invalid email or password")) {
    return "Email ou senha inválidos.";
  }
  if (msg.includes("invalid credentials")) {
    return "Dados de acesso inválidos.";
  }
  if (msg.includes("failed to fetch") || msg.includes("network")) {
    return "Não foi possível conectar. Verifique sua internet.";
  }
  if (status === 401) {
    return "Email ou senha inválidos.";
  }
  if (status >= 500) {
    return "Servidor indisponível no momento. Tente novamente.";
  }

  return raw || "Ocorreu um erro inesperado. Tente novamente.";
}

async function throwIfResNotOk(res: Response) {
  if (res.ok) return;

  let rawMessage = "";

  try {
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      rawMessage = body?.message ?? "";
    } else {
      const text = (await res.text()).trim();
      if (text) {
        try {
          const parsed = JSON.parse(text) as { message?: string };
          rawMessage = parsed?.message ?? text;
        } catch {
          rawMessage = text;
        }
      }
    }
  } catch {
    rawMessage = "";
  }

  throw new Error(toFriendlyErrorMessage(rawMessage, res.status));
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

  const res = await fetch(url.toString(), {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const baseUrl = getApiUrl();
    const url = new URL(queryKey.join("/") as string, baseUrl);

    const res = await fetch(url.toString(), {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
