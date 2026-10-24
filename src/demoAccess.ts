export const DEMO_EMAIL = "admin@demo.local";
// Intentionally public credential for synthetic demonstration accounts only.
export const DEMO_PASSWORD = "LocalDemo-26264!";
export const DEMO_STORAGE_KEY = "bureausetu-judge-demo-v2";
export function isBrowserPreview() {
  return (
    typeof window !== "undefined" &&
    (window.location.hostname.endsWith(".github.io") ||
      window.location.protocol === "file:" ||
      new URLSearchParams(window.location.search).get("demo") === "1")
  );
}
