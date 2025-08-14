/**
 * Wallet management (SEO: solana keypair generator, auto wallet creation, base58 private key import)
 */
import { Keypair } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import bs58 from "bs58";

export const loadOrCreateKeypair = (keypairPath: string, privateKeyBase58?: string): Keypair => {
  if (privateKeyBase58) {
    const secret = bs58.decode(privateKeyBase58);
    const kp = Keypair.fromSecretKey(secret);
    return kp;
  }

  if (fs.existsSync(keypairPath)) {
    const raw = fs.readFileSync(keypairPath, "utf8");
    const arr = Uint8Array.from(JSON.parse(raw));
    return Keypair.fromSecretKey(arr);
  }

  const kp = Keypair.generate();
  const dir = path.dirname(keypairPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(keypairPath, JSON.stringify(Array.from(kp.secretKey), null, 2));
  console.log(`Created new wallet at ${keypairPath} (public: ${kp.publicKey.toBase58()})`);
  return kp;
};
