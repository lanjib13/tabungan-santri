import { z } from "zod";

const rawUrl = (
  process.env.NEXT_PUBLIC_API_URL ?? "https://be-tbg.onrender.com/api"
).replace(/\/+$/, "");
const apiBaseUrl = rawUrl.endsWith("/api") ? rawUrl : `${rawUrl}/api`;

const apiHealthSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.object({
    service: z.literal("simpanku-api"),
    status: z.literal("ok"),
  }),
});

export type ApiHealth = z.infer<typeof apiHealthSchema>["data"];

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

function readCsrfCookie(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const entry = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith("simpanku_csrf="));
  return entry ? decodeURIComponent(entry.slice("simpanku_csrf=".length)) : undefined;
}

export async function apiRequest<T>(path: string, dataSchema: z.ZodType<T>, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  if (init.method && !["GET", "HEAD", "OPTIONS"].includes(init.method.toUpperCase())) {
    const csrfToken = readCsrfCookie();
    if (csrfToken) headers.set("x-csrf-token", csrfToken);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError("Respons server tidak valid", response.status);
  }

  const success = z.object({ success: z.literal(true), message: z.string(), data: dataSchema }).safeParse(payload);
  if (!response.ok || !success.success) {
    const failure = z.object({ success: z.literal(false), message: z.string(), errors: z.record(z.string(), z.array(z.string())).optional() }).safeParse(payload);
    throw new ApiError(failure.success ? failure.data.message : "Permintaan gagal", response.status);
  }
  return success.data.data;
}

export async function getApiHealth(signal?: AbortSignal): Promise<ApiHealth> {
  const response = await fetch(`${apiBaseUrl}/health`, {
    credentials: "include",
    signal,
  });

  if (!response.ok) {
    throw new Error(`API merespons dengan status ${response.status}`);
  }

  const payload: unknown = await response.json();
  return apiHealthSchema.parse(payload).data;
}
