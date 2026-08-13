import type { SearchSource, SearchResponse, SearchResult } from "../types";

/**
 * Keyless fallback search adapter — scrapes the DuckDuckGo HTML endpoint.
 * No API key required, so the pipeline always has *some* real search source.
 * Lower reliability than Brave (rate-limited, markup can change), which is
 * exactly why it sits behind the resolver as the fallback.
 */
export const duckduckgo: SearchSource = {
  name: "duckduckgo_html",
  kind: "search",
  tier: "free",

  available() {
    return true; // no config required
  },

  async search(query, opts = {}): Promise<SearchResponse> {
    const count = opts.count ?? 8;
    const url = new URL("https://html.duckduckgo.com/html/");
    url.searchParams.set("q", query);

    const res = await fetch(url, {
      headers: {
        // a browser-ish UA reduces the chance of being served a blocked page
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        Accept: "text/html",
      },
    });

    if (!res.ok) {
      throw new Error(`DuckDuckGo search failed: ${res.status}`);
    }

    const html = await res.text();
    return { query, source: "duckduckgo_html", results: parseResults(html, count) };
  },
};

/** Parse DDG HTML results without a DOM dependency. */
function parseResults(html: string, limit: number): SearchResult[] {
  const results: SearchResult[] = [];

  // Each result link: <a ... class="result__a" href="...">Title</a>
  const linkRe = /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  // Snippet: <a ... class="result__snippet" ...>text</a>
  const snippetRe = /class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/g;

  const snippets: string[] = [];
  let sm: RegExpExecArray | null;
  while ((sm = snippetRe.exec(html)) !== null) snippets.push(clean(sm[1]));

  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = linkRe.exec(html)) !== null && results.length < limit) {
    results.push({
      url: decodeDdgUrl(m[1]),
      title: clean(m[2]),
      snippet: snippets[i] ?? "",
    });
    i++;
  }
  return results;
}

/** DDG wraps outbound links as //duckduckgo.com/l/?uddg=<encoded> */
function decodeDdgUrl(href: string): string {
  try {
    const u = new URL(href, "https://duckduckgo.com");
    const uddg = u.searchParams.get("uddg");
    return uddg ? decodeURIComponent(uddg) : href;
  } catch {
    return href;
  }
}

function clean(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}
