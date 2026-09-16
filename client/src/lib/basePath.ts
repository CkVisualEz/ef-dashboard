/** App base path for routes (e.g. "" locally or "/EF-Dashboard" in production). */
export function getBasePath(): string {
  if (typeof window !== "undefined") {
    const { pathname } = window.location;
    if (pathname.startsWith("/EF-Dashboard")) {
      return "/EF-Dashboard";
    }
  }

  if (import.meta.env.PROD) {
    const configured = import.meta.env.BASE_URL?.replace(/\/$/, "");
    return configured || "/EF-Dashboard";
  }

  return import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
}

/** Prefix an app route with the current base path. */
export function withBasePath(path: string): string {
  const base = getBasePath();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${normalizedPath}` : normalizedPath;
}

/** API base URL — same origin in dev; env override or base path in production. */
export function getApiBase(): string {
  if (!import.meta.env.PROD) {
    return "";
  }

  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, "");
  }

  return getBasePath();
}
