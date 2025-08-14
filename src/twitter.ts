/**
 * Twitter (X) watcher using official API v2.
 * SEO: twitter scraper, pumpfun announcement, bonkfun new token, real-time alerts, token ca detection
 */
import { TwitterApi } from "twitter-api-v2";

export type TweetSignal = {
  id: string;
  text: string;
  author: string;
  created_at: string;
  foundMint?: string | null;
};

export class TwitterWatcher {
  private client: TwitterApi;
  constructor(bearerToken: string) {
    this.client = new TwitterApi(bearerToken);
  }

  /**
   * Poll recent tweets by accounts with keyword filters. Returns newest first.
   * @param accounts Comma/space separated handles (without @)
   * @param keywords CSV list of keywords to look for
   * @param mintField Optional marker like 'CA:' or 'Mint:' to extract token mint
   */
  async fetchSignals(accounts: string[], keywords: string[], mintField?: string): Promise<TweetSignal[]> {
    const qAccounts = accounts.map(a => `from:${a}`).join(" OR ");
    const qKeywords = keywords.length ? " (" + keywords.map(k => `"${k}"`).join(" OR ") + ")" : "";
    const query = `${qAccounts}${qKeywords} -is:retweet`;

    const res = await this.client.v2.search(query, { "tweet.fields": ["created_at", "author_id"] , max_results: 20 });
    const out: TweetSignal[] = [];
    for await (const tweet of res) {
      const txt = tweet.text || "";
      const found = mintField ? this.extractMint(txt, mintField) : null;
      out.push({
        id: tweet.id,
        text: txt,
        author: tweet.author_id || "unknown",
        created_at: tweet.created_at || new Date().toISOString(),
        foundMint: found
      });
    }
    // newest first
    return out.sort((a,b) => (b.created_at || "").localeCompare(a.created_at || ""));
  }

  private extractMint(text: string, marker: string): string | null {
    // very naive extractor: looks for '<marker> <MINT>'
    const idx = text.indexOf(marker);
    if (idx === -1) return null;
    const tail = text.slice(idx + marker.length).trim();
    const cand = tail.split(/\s|,|;|\)|\(|\n/)[0].trim();
    // Basic sanity check: base58-ish length
    if (cand.length >= 32 && cand.length <= 60) return cand;
    return null;
  }
}
