import { startAuthentication, startRegistration } from "@simplewebauthn/browser";

export async function registerPasskey() {
  const options = await fetchJson("/api/passkeys/register/options", { method: "POST" });
  const credential = await startRegistration({ optionsJSON: options });
  return fetchJson("/api/passkeys/register/verify", {
    method: "POST",
    body: JSON.stringify(credential)
  });
}

export async function authenticatePasskey() {
  const options = await fetchJson("/api/passkeys/authenticate/options", { method: "POST" });
  const assertion = await startAuthentication({ optionsJSON: options });
  return fetchJson("/api/passkeys/authenticate/verify", {
    method: "POST",
    body: JSON.stringify(assertion)
  });
}

async function fetchJson(url: string, init: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init.headers
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
}
