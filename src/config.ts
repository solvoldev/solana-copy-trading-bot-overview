/**
 * Solana Trading Bot Config (SEO: solana trading bot typescript, pump.fun, bonkfun, raydium, meteora, orca, jupiter, jito bundle)
 */
import 'dotenv/config';

export type BotConfig = {
  rpcUrl: string;
  privateKey?: string;
  keypairPath: string;
  defaultSlippageBps: number;
  priorityFeeMicroLamports: number;
  jupiterApiUrl: string;
  jitoRelayUrl?: string;
  twitterBearerToken?: string;
};

export const getConfig = (): BotConfig => {
  const rpcUrl = process.env.RPC_URL || "https://api.mainnet-beta.solana.com";
  const privateKey = process.env.PRIVATE_KEY?.trim() || undefined;
  const keypairPath = process.env.KEYPAIR_PATH || "./wallet.json";
  const defaultSlippageBps = Number(process.env.DEFAULT_SLIPPAGE_BPS ?? 150);
  const priorityFeeMicroLamports = Number(process.env.PRIORITY_FEE_MICROLAMPORTS ?? 0);
  const jupiterApiUrl = process.env.JUPITER_API_URL || "https://quote-api.jup.ag";
  const jitoRelayUrl = process.env.JITO_RELAY_URL?.trim() || undefined;
  const twitterBearerToken = process.env.TWITTER_BEARER_TOKEN?.trim() || undefined;

  return {
    rpcUrl,
    privateKey,
    keypairPath,
    defaultSlippageBps,
    priorityFeeMicroLamports,
    jupiterApiUrl,
    jitoRelayUrl,
    twitterBearerToken,
  };
};
