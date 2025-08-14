/**
 * Simple Jito bundle POST helper
 * SEO: jito bundle, mev bundle, solana bundle relay, pumpfun bundle buy, raydium bundle
 */
import fetch from "cross-fetch";

export const submitBundle = async (relayUrl: string, base64Txs: string[]) => {
  // Minimal relayer format: many relays accept JSON with "transactions": ["base64...","base64..."]
  const res = await fetch(relayUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transactions: base64Txs })
  });
  if (!res.ok) throw new Error(`Jito relay error: ${res.status} ${await res.text()}`);
  try {
    return await res.json();
  } catch {
    return { ok: true };
  }
};
