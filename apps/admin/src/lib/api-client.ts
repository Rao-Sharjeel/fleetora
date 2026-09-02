import { useSession } from "@/hooks/use-session";

const API_BASE_URL = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8000/api").replace(
  /\/+$/,
  "",
);

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `Request failed with status ${status}`);
    this.status = status;
    this.body = body;
  }
}

interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

type QueryParams = Record<string, string | number | boolean | undefined>;

function buildUrl(path: string, params?: QueryParams): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${API_BASE_URL}${cleanPath}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function safeJson(res: Response): Promise<unknown> {
  if (res.status === 204) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function extractErrorMessage(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const record = body as Record<string, unknown>;
  if (typeof record.detail === "string") return record.detail;
  const firstValue = Object.values(record)[0];
  if (Array.isArray(firstValue) && typeof firstValue[0] === "string") return firstValue[0];
  return undefined;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  params?: QueryParams;
  /** Internal — prevents infinite refresh-and-retry loops. */
  _retried?: boolean;
}

let refreshInFlight: Promise<string> | null = null;

/** Exchanges the stored refresh token for a new access token, coalescing concurrent callers. */
function refreshAccessToken(): Promise<string> {
  const refreshToken = useSession.getState().refreshToken;
  if (!refreshToken) return Promise.reject(new ApiError(401, null, "No refresh token available."));

  if (!refreshInFlight) {
    refreshInFlight = fetch(buildUrl("/auth/refresh/"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
    })
      .then(async (res) => {
        const data = await safeJson(res);
        if (!res.ok) throw new ApiError(res.status, data, extractErrorMessage(data));
        const tokens = data as { access: string; refresh?: string };
        useSession.getState().setTokens(tokens);
        return tokens.access;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

async function requestUrl<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, _retried = false } = options;
  const accessToken = useSession.getState().accessToken;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !_retried && useSession.getState().refreshToken) {
    try {
      await refreshAccessToken();
    } catch {
      useSession.getState().logout();
      throw new ApiError(401, null, "Session expired. Please sign in again.");
    }
    return requestUrl<T>(url, { ...options, _retried: true });
  }

  const data = await safeJson(res);
  if (!res.ok) {
    throw new ApiError(res.status, data, extractErrorMessage(data) ?? `Request failed with status ${res.status}`);
  }
  return data as T;
}

function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return requestUrl<T>(buildUrl(path, options.params), options);
}

export function apiGet<T>(path: string, params?: QueryParams): Promise<T> {
  return request<T>(path, { method: "GET", params });
}

/**
 * Unwraps DRF's {count, next, previous, results} pagination envelope,
 * auto-following `next` and concatenating every page — callers get the
 * complete collection as a flat array, same as the mock services always
 * returned, rather than silently truncating at PAGE_SIZE (50).
 */
export async function apiList<T>(path: string, params?: QueryParams): Promise<T[]> {
  const first = await request<Paginated<T> | T[]>(path, { method: "GET", params });
  if (Array.isArray(first)) return first;

  const results = [...first.results];
  let next = first.next;
  while (next) {
    const page = await requestUrl<Paginated<T>>(next, { method: "GET" });
    results.push(...page.results);
    next = page.next;
  }
  return results;
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: "POST", body });
}

export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: "PATCH", body });
}

export function apiDelete(path: string): Promise<void> {
  return request<void>(path, { method: "DELETE" });
}

// --- Auth bootstrap calls (unauthenticated, so they bypass the Authorization header above) ---

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface MeResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
}

export async function authLogin(username: string, password: string): Promise<AuthTokens> {
  const res = await fetch(buildUrl("/auth/login/"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await safeJson(res);
  if (!res.ok) {
    throw new ApiError(res.status, data, extractErrorMessage(data) ?? "Invalid username or password.");
  }
  return data as AuthTokens;
}

export function authMe(): Promise<MeResponse> {
  return apiGet<MeResponse>("/auth/me/");
}
