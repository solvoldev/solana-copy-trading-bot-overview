/**
 * Web3 Connection Factory (SEO: solana rpc connection, priority fee, blockhash, transaction sender)
 */
import { Connection, clusterApiUrl } from "@solana/web3.js";
import type { BotConfig } from "./config";

export const makeConnection = (cfg: BotConfig) => {
  // Let users pass a custom RPC; fallback to mainnet
  const endpoint = cfg.rpcUrl || clusterApiUrl("mainnet-beta");
  // commitment processed is fine for trading; you can switch to confirmed/finalized
  return new Connection(endpoint, { commitment: "processed" });
};
