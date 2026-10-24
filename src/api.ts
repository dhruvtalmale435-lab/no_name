import { handleDemoApi } from "./demoApi";
import { isBrowserPreview } from "./demoAccess";
import { ApiError } from "./apiError";
export { ApiError } from "./apiError";

export async function api<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  if (isBrowserPreview()) {
    return handleDemoApi(path, options);
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

    throw new ApiError(
      "The server returned an unexpected response. Retry when the API is available.",
      response.status || 503,
    );
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      "Cannot connect to the server. Your saved server records have not been replaced by demo data.",
      503,
    );
  }
}

export const send = (method: string, body?: unknown) => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
});
