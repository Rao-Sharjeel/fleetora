import { useDeviceSession } from "../state/device-session";

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
}

/** No refresh-retry here — unlike the admin app's JWTs, a kiosk device key
 * doesn't expire. A 401 means the key is wrong or the device was revoked, so
 * it unpairs immediately and lets DeviceGate fall back to the pairing screen. */
async function requestUrl<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body } = options;
  const apiKey = useDeviceSession.getState().apiKey;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (apiKey) headers["X-Kiosk-Api-Key"] = apiKey;

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    useDeviceSession.getState().unpair();
    throw new ApiError(401, null, "This device is no longer paired. Please pair it again.");
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

/** Unwraps DRF's {count, next, previous, results} pagination envelope, auto-following
 * `next` and concatenating every page — same behavior as the admin app's client. */
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
