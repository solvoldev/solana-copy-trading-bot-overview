/**
 * Solana Trading Bot - CLI
 * 
 * SEO / GitHub Keywords:
 * solana trading bot typescript, pump.fun bundle bot, bonkfun sniping, raydium swap bot, meteora liquidity, orca dex swaps, jupiter aggregator v6, jito bundle relay, auto buy token, twitter scraper, memecoin sniper, open-source solana bot, best solana bot 2025.
 */
import { Command } from "commander";
import { getConfig } from "./config";
import { makeConnection } from "./rpc";
import { loadOrCreateKeypair } from "./wallet";
import { getQuote, buildSwapTx, signAndSendVtx } from "./jupiter";
import { submitBundle } from "./bundle";
import { TwitterWatcher } from "./twitter";
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";

const program = new Command();

program
  .name("solana-trading-bot")
  .description("Solana Trading Bot (TypeScript) with Jupiter swaps, optional Jito bundles, and a Twitter watcher.")
  .version("1.0.0");

program
  .command("setup")
  .description("Create or import the wallet (auto if missing).")
  .action(async () => {
    const cfg = getConfig();
    const kp = loadOrCreateKeypair(cfg.keypairPath, cfg.privateKey);
    console.log(`Wallet ready: ${kp.publicKey.toBase58()}`);
  });

program
  .command("buy")
  .requiredOption("--mint <address>", "Token mint to buy (SPL)")
  .option("--sol <amount>", "SOL amount to spend", "0.02")
  .option("--slippage-bps <bps>", "Slippage in BPS (100=1%)", (v) => String(v), String(getConfig().defaultSlippageBps))
  .option("--dexes <list>", "Comma separated DEX filters (Raydium,Orca,Meteora,Pump,Bonk)", "Raydium,Orca,Meteora")
  .action(async (opts) => {
    const cfg = getConfig();
    const connection = makeConnection(cfg);
    const kp = loadOrCreateKeypair(cfg.keypairPath, cfg.privateKey);

    const solAmount = Number(opts.sol);
    const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);
    const slippage = Number(opts["slippageBps"] ?? opts["slippage-bps"] ?? cfg.defaultSlippageBps);
    const dexes = String(opts.dexes || "").split(",").map((s: string) => s.trim()).filter(Boolean);

    console.log(`Quoting via Jupiter for ${solAmount} SOL -> ${opts.mint} (slippage ${slippage} bps) ...`);
    const quote = await getQuote(cfg, opts.mint, lamports, slippage, dexes);
    const txb64 = await buildSwapTx(cfg, quote, kp.publicKey);
    console.log("Signing & sending swap...");
    const sig = await signAndSendVtx(connection, txb64, kp.secretKey);
    console.log(`Swap submitted: https://solscan.io/tx/${sig}`);
  });

program
  .command("bundle-buy")
  .requiredOption("--mints <list>", "Comma-separated token mints to buy")
  .option("--sol-per <amount>", "SOL amount per token", "0.01")
  .option("--slippage-bps <bps>", "Slippage in BPS", (v) => String(v), String(getConfig().defaultSlippageBps))
  .action(async (opts) => {
    const cfg = getConfig();
    if (!cfg.jitoRelayUrl) {
      console.log("No JITO_RELAY_URL provided. Will send sequentially (non-bundled).");
    }
    const connection = makeConnection(cfg);
    const kp = loadOrCreateKeypair(cfg.keypairPath, cfg.privateKey);
    const mints: string[] = String(opts.mints).split(",").map((s: string) => s.trim()).filter(Boolean);
    const solPer = Number(opts["solPer"] ?? opts["sol-per"] ?? "0.01");
    const lamportsPer = Math.floor(solPer * LAMPORTS_PER_SOL);
    const slippage = Number(opts["slippageBps"] ?? opts["slippage-bps"] ?? cfg.defaultSlippageBps);

    const txs: string[] = [];
    for (const mint of mints) {
      const quote = await getQuote(cfg, mint, lamportsPer, slippage);
      const txb64 = await buildSwapTx(cfg, quote, kp.publicKey);
      txs.push(txb64);
    }

    if (cfg.jitoRelayUrl) {
      console.log(`Submitting bundle of ${txs.length} tx(s) to Jito relay...`);
      const res = await submitBundle(cfg.jitoRelayUrl, txs);
      console.log("Bundle response:", res);
    } else {
      console.log("Sending transactions sequentially...");
      for (const txb64 of txs) {
        const sig = await signAndSendVtx(connection, txb64, kp.secretKey);
        console.log(`Sent: https://solscan.io/tx/${sig}`);
      }
    }
  });

program
  .command("watch-twitter")
  .option("--accounts <handles>", "Comma-separated handles without @", "pumpfun,bonkbot,raydiumprotocol")
  .option("--keywords <csv>", "CSV of trigger keywords", "launch,live,token,raydium")
  .option("--mint-field <marker>", "Marker to extract mint, e.g. 'CA:'", "CA:")
  .option("--poll-sec <n>", "Polling interval seconds", "20")
  .option("--auto-buy", "Auto-buy when a mint is found", false)
  .option("--sol <amount>", "SOL amount to buy when triggered", "0.01")
  .option("--slippage-bps <bps>", "Slippage BPS for auto-buy", (v) => String(v), String(getConfig().defaultSlippageBps))
  .action(async (opts) => {
    const cfg = getConfig();
    if (!cfg.twitterBearerToken) {
      console.error("TWITTER_BEARER_TOKEN missing in .env");
      process.exit(1);
    }
    const watcher = new TwitterWatcher(cfg.twitterBearerToken);
    const accounts = String(opts.accounts).split(",").map((s: string) => s.trim()).filter(Boolean);
    const keywords = String(opts["keywords"] || "").split(",").map((s: string) => s.trim()).filter(Boolean);
    const pollSec = Number(opts["pollSec"] ?? opts["poll-sec"] ?? 20);
    const autoBuy = Boolean(opts["autoBuy"] ?? opts["auto-buy"]);
    const solAmount = Number(opts.sol);
    const slippage = Number(opts["slippageBps"] ?? opts["slippage-bps"] ?? cfg.defaultSlippageBps);

    const connection = makeConnection(cfg);
    const kp = loadOrCreateKeypair(cfg.keypairPath, cfg.privateKey);

    console.log(`Watching X/Twitter: ${accounts.join(", ")} | keywords: ${keywords.join(", ")} | poll: ${pollSec}s`);
    let seen = new Set<string>();
    for (;;) {
      try {
        const signals = await watcher.fetchSignals(accounts, keywords, String(opts["mintField"] ?? opts["mint-field"] ?? "CA:"));
        for (const s of signals) {
          if (seen.has(s.id)) continue;
          seen.add(s.id);
          console.log(`[${s.created_at}] @${s.author}: ${s.text}`);
          if (s.foundMint) {
            console.log(`Detected mint: ${s.foundMint}`);
            if (autoBuy) {
              const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);
              try {
                const quote = await getQuote(cfg, s.foundMint, lamports, slippage);
                const txb64 = await buildSwapTx(cfg, quote, kp.publicKey);
                const sig = await signAndSendVtx(connection, txb64, kp.secretKey);
                console.log(`Auto-buy tx: https://solscan.io/tx/${sig}`);
              } catch (err) {
                console.error("Auto-buy failed:", err);
              }
            }
          }
        }
      } catch (e) {
        console.error("Watcher error:", e);
      }
      await new Promise(r => setTimeout(r, pollSec * 1000));
    }
  });

program.parseAsync();
