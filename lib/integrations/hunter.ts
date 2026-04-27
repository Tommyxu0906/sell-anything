// Hunter.io email finder — fallback when Apollo doesn't have email

const HUNTER_BASE = "https://api.hunter.io/v2";

export async function findEmail(firstName: string, lastName: string, domain: string): Promise<string | null> {
  const apiKey = process.env.HUNTER_API_KEY;
  if (!apiKey) return null;

  const params = new URLSearchParams({
    first_name: firstName,
    last_name: lastName,
    domain,
    api_key: apiKey,
  });

  const res = await fetch(`${HUNTER_BASE}/email-finder?${params}`);
  if (!res.ok) return null;

  const data = await res.json();
  const email = data.data?.email;
  const confidence = data.data?.confidence ?? 0;

  // Only return if confidence >= 70%
  return confidence >= 70 ? email : null;
}

export async function verifyEmail(email: string): Promise<"valid" | "risky" | "invalid"> {
  const apiKey = process.env.HUNTER_API_KEY;
  if (!apiKey) return "risky";

  const params = new URLSearchParams({ email, api_key: apiKey });
  const res = await fetch(`${HUNTER_BASE}/email-verifier?${params}`);
  if (!res.ok) return "risky";

  const data = await res.json();
  return data.data?.result ?? "risky";
}
