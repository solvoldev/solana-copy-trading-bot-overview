/**
 * Jupiter v6 Quote & Swap helpers
 * SEO: Jupiter aggregator, Raydium, Orca, Meteora routes, SOL to SPL swap, token sniping
 */
import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import type { BotConfig } from "./config";
import fetch from "cross-fetch";

export type QuoteResponse = any; // keep flexible to avoid type drift with API

const SOL_MINT = "So11111111111111111111111111111111111111112";

export const getQuote = async (cfg: BotConfig, outputMint: string, inLamports: number, slippageBps: number, allowedDexes?: string[]) => {
  const url = new URL(`${cfg.jupiterApiUrl}/v6/quote`);
  url.searchParams.set("inputMint", SOL_MINT);
  url.searchParams.set("outputMint", outputMint);
  url.searchParams.set("amount", String(inLamports));
  url.searchParams.set("slippageBps", String(slippageBps));
  // You may also set "onlyDirectRoutes" or "excludeDexes" per future Jupiter features
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Jupiter quote failed: ${res.status} ${await res.text()}`);
  const data = await res.json();

  // Optionally filter routes to only those containing allowed DEX names
  if (allowedDexes && Array.isArray(data?.data)) {
    data.data = data.data.filter((route: any) => {
      const legs = route?.marketInfos || route?.routePlan || [];
      const dexNames = legs.map((l: any) => l.label || l.amm || l.market || l.dex || "").map((s: string) => s.toLowerCase());
      return allowedDexes.some(d => dexNames.some(name => name.includes(d.toLowerCase())));
    });
  }

  if (!data?.data?.length) throw new Error("No viable Jupiter route after DEX filtering.");
  return data.data[0]; // best route
};

export const buildSwapTx = async (cfg: BotConfig, quote: QuoteResponse, userPubkey: PublicKey) => {
  const swapUrl = `${cfg.jupiterApiUrl}/v6/swap`;
  const res = await fetch(swapUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userPublicKey: userPubkey.toBase58(),
      quoteResponse: quote,
      wrapAndUnwrapSol: true,
      asLegacyTransaction: false
    })
  });
  if (!res.ok) throw new Error(`Jupiter swap build failed: ${res.status} ${await res.text()}`);
  const j = await res.json();
  const txB64 = j?.swapTransaction;
  if (!txB64) throw new Error("Jupiter response missing swapTransaction");
  return txB64;
};

export const signAndSendVtx = async (connection: Connection, txB64: string, signer: Uint8Array) => {
  const vtx = VersionedTransaction.deserialize(Buffer.from(txB64, "base64"));
  vtx.sign([ { publicKey: vtx.message.staticAccountKeys[0], secretKey: signer } as any ]);
  const sig = await connection.sendRawTransaction(vtx.serialize(), { skipPreflight: true, maxRetries: 3 });
  return sig;
};
