import { API_BASE_URL } from "./api_config.js";

function readSessionToken() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem("olympo_token");
  } catch {
    return null;
  }
}

function isBackendRequest(input) {
  const rawUrl = typeof input === "string" ? input : input.url;
  const appOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost";

  try {
    const requestUrl = new URL(rawUrl, appOrigin);
    if (!requestUrl.pathname.startsWith("/api/")) return false;
    if (!API_BASE_URL) return requestUrl.origin === appOrigin;

    const backendUrl = new URL(API_BASE_URL, appOrigin);
    const backendPath = backendUrl.pathname.replace(/\/$/, "");
    return requestUrl.origin === backendUrl.origin
      && (backendPath === "" || requestUrl.pathname.startsWith(backendPath));
  } catch {
    return false;
  }
}

/** Cliente HTTP único del frontend. Adjunta sesión y centraliza el 401. */
export async function apiFetch(input, init = {}) {
  const headers = new Headers(input instanceof Request ? input.headers : undefined);
  new Headers(init.headers || {}).forEach((value, key) => headers.set(key, value));

  const token = readSessionToken();
  if (token && isBackendRequest(input)) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(input, { ...init, headers });
  if (response.status === 401 && token && typeof window !== "undefined") {
    window.dispatchEvent(new Event("olympo:session-expired"));
  }
  return response;
}
