import type { ApiError, ApiErrorCode, User, WeeklyReport } from "@nexora/shared";

// ponytail: client-side fetch with the session cookie (credentials: "include"),
// no SSR loaders or server functions. Upgrade path: move these into TanStack
// Start server functions once web and API share an origin.
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export type ProblemCode = ApiErrorCode | "network";

/** Every failure reaches the UI as one of these, so screens can branch on `code`. */
export class ApiProblem extends Error {
  readonly code: ProblemCode;

  constructor(code: ProblemCode, message: string) {
    super(message);
    this.name = "ApiProblem";
    this.code = code;
  }
}

async function request<T>(path: string, body?: unknown): Promise<T> {
  const init: RequestInit =
    body === undefined
      ? { credentials: "include" }
      : {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        };

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, init);
  } catch {
    throw new ApiProblem("network", "Bağlantı kurulamadı.");
  }

  const payload: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const problem = (payload as ApiError | null)?.error;
    throw new ApiProblem(problem?.code ?? "upstream_unavailable", problem?.message ?? "Beklenmeyen bir hata oluştu.");
  }
  return payload as T;
}

export async function login(persona: "ece" | "mert"): Promise<User> {
  // The API also returns `token` for Bearer clients; web rides the HttpOnly cookie.
  const { user } = await request<{ user: User; token: string }>("/auth/login", { persona });
  return user;
}

export function approveConsent(youthId: string): Promise<unknown> {
  return request("/consent/parent/approve", { youthId });
}

const emptyReport = (youthId: string): WeeklyReport => ({
  youthId,
  period: null,
  score: null,
  distribution: {},
  trend: [],
  task: null,
  share_text: null,
  empty: true,
});

/** docs/API.md: the panel must treat `404 no_data` exactly like `empty: true`. */
export async function fetchWeeklyReport(youthId: string): Promise<WeeklyReport> {
  try {
    return await request<WeeklyReport>(`/reports/weekly?youthId=${encodeURIComponent(youthId)}`);
  } catch (error) {
    if (error instanceof ApiProblem && error.code === "no_data") return emptyReport(youthId);
    throw error;
  }
}
