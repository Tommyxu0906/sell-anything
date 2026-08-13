import type { FetchSource, FetchedPage } from "../types";

const MAX_TEXT = 12_000; // cap extracted text so downstream LLM cost stays bounded

/**
 * Server-side page fetcher + lightweight readability. Pulls a URL and strips it
 * down to plain text so the extractor can read competitor sites, review pages,
 * etc. Intentionally dependency-free (regex, not a headless browser) — good
 * enough for text signals, and cheap.
 */
export const pageFetch: FetchSource = {
  name: "page_fetch",
  kind: "fetch",
  tier: "free",

  available() {
    return true;
  },

  async fetchPage(url): Promise<FetchedPage> {
    const fetchedAt = new Date().toISOString();
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; sellAnythingBot/1.0; +research)",
          Accept: "text/html",
        },
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        return { url, text: "", fetchedAt, ok: false, error: `HTTP ${res.status}` };
      }

      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("text/html")) {
        return { url, text: "", fetchedAt, ok: false, error: `non-HTML (${contentType})` };
      }

      const html = await res.text();
      return {
        url,
        title: extractTitle(html),
        text: htmlToText(html).slice(0, MAX_TEXT),
        fetchedAt,
        ok: true,
      };
    } catch (e) {
      return {
        url,
        text: "",
        fetchedAt,
        ok: false,
        error: e instanceof Error ? e.message : "fetch failed",
      };
    }
  },
};

function extractTitle(html: string): string | undefined {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return m ? decodeEntities(m[1].replace(/\s+/g, " ").trim()) : undefined;
}

function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<\/(p|div|li|h[1-6]|section|article|br)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
