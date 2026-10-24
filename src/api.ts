import { handleMockApi } from "./mockData";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

let isStaticHost =
  typeof window !== "undefined" &&
  (window.location.hostname.includes("github.io") ||
    window.location.protocol === "file:");

export async function api<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  if (isStaticHost) {
    return handleMockApi(path, options);
  }

  try {
    const response = await fetch("/api" + path, {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
      credentials: "same-origin",
    });

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await response.json();
      if (!response.ok) {
        throw new ApiError(data.error || "Request failed", response.status);
      }
      return data;
    }

    if (!response.ok) {
      if (typeof window !== "undefined") {
        isStaticHost = true;
        return handleMockApi(path, options);
      }
      throw new ApiError(
        `Request failed with status ${response.status}`,
        response.status,
      );
    }

    return (await response.text()) as unknown as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (typeof window !== "undefined") {
      isStaticHost = true;
      return handleMockApi(path, options);
    }
    throw err;
  }
}

export const send = (method: string, body?: unknown) => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
});
