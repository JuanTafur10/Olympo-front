import { API_BASE_URL } from "./api_config.js";

export async function apiFetch(input, init = {}) {
  const url = typeof input === "string" ? input : input.url;
  const headers = new Headers(init.headers || {});
  const token = typeof window !== "undefined" ? window.localStorage.getItem("olympo_token") : null;

  if (token && url.startsWith(API_BASE_URL)) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(input, { ...init, headers });
  if (response.status === 401 && token && typeof window !== "undefined") {
    window.dispatchEvent(new Event("olympo:session-expired"));
  }
  return response;
}
