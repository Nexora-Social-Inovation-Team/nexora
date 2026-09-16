import { useSyncExternalStore } from "react";
import { Platform } from "react-native";

import type {
  ApiError,
  ApiErrorCode,
  CoachResponse,
  Persona,
  Score,
  User,
  WeeklyReport,
} from "@nexora/shared";

/** Android emulators cannot reach the host through `localhost`. */
const defaultBase = Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000";
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? defaultBase;

/* ---------------------------------------------------------------- session */

type Session = { token: string | null; user: User | null; persona?: Persona };

let session: Session = { token: null, user: null };
const listeners = new Set<() => void>();

/**
 * ponytail: the bearer token lives in memory only, so a cold start returns to
 * onboarding. Persist with expo-secure-store when the app leaves demo scope.
 */
export function setSession(next: Session): void {
  session = next;
  for (const listen of listeners) listen();
}

export const getSession = (): Session => session;

export function useSession(): Session {
  return useSyncExternalStore(
    (listen) => {
      listeners.add(listen);
      return () => {
        listeners.delete(listen);
      };
    },
    getSession,
    getSession,
  );
}

/* ------------------------------------------------------------------ fetch */

export class ApiFailure extends Error {
  readonly code: ApiErrorCode;

  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.name = "ApiFailure";
    this.code = code;
  }
}

/** `instanceof` is unreliable across bundles, so match on the tagged name. */
export function failureCode(error: unknown): ApiErrorCode | null {
  return error instanceof Error && error.name === "ApiFailure"
    ? (error as ApiFailure).code
    : null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(session.token ? { Authorization: `Bearer ${session.token}` } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiFailure("upstream_unavailable", "Bağlantı kurulamadı. Tekrar dene.");
  }
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const error = (body as ApiError | null)?.error;
    throw new ApiFailure(
      error?.code ?? "upstream_unavailable",
      error?.message ?? "Bir şeyler ters gitti. Tekrar dene.",
    );
  }
  return body as T;
}

/* --------------------------------------------------------------- requests */

export async function login(persona: Persona): Promise<User> {
  const { user, token } = await request<{ user: User; token: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ persona }),
  });
  setSession({ token, user, persona });
  return user;
}

export async function refreshMe(): Promise<User> {
  const { user } = await request<{ user: User }>("/users/me");
  setSession({ ...session, user });
  return user;
}

export const getScore = (): Promise<Score> => request<Score>("/score/current");

export const getWeeklyReport = (): Promise<WeeklyReport> =>
  request<WeeklyReport>("/reports/weekly");

export const getCoach = (): Promise<CoachResponse> =>
  request<CoachResponse>("/coach/recommendation");

export const completeTask = (taskId: string): Promise<{ id: string; badge: string }> =>
  request(`/tasks/${taskId}/complete`, { method: "POST" });

/** Demo only — called from a control that exists solely under `__DEV__`. */
export const approveConsent = (youthId: string): Promise<{ youthId: string; status: string }> =>
  request("/consent/parent/approve", { method: "POST", body: JSON.stringify({ youthId }) });
