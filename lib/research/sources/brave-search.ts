import type { SearchSource, SearchResponse } from "../types";

/**
 * Brave Search API adapter. Free tier: https://brave.com/search/api/
 * Requires BRAVE_API_KEY. This is the preferred free search source; when the
 * key is absent the resolver falls back to the keyless DuckDuckGo adapter.
 */
export const braveSearch: SearchSource = {
  name: "brave_search",
  kind: "search",
  tier: "free",

  available() {
    return Boolean(process.env.BRAVE_API_KEY);
  },

  async search(query, opts = {}): Promise<SearchResponse> {
    const count = Math.min(opts.count ?? 8, 20);
    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", query);
    url.searchParams.set("count", String(count));

    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": process.env.BRAVE_API_KEY ?? "",
      },
    });

    if (!res.ok) {
      throw new Error(`Brave search failed: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as {
      web?: { results?: Array<{ title?: string; url?: string; description?: string }> };
    };

    const results = (data.web?.results ?? []).map((r) => ({
      title: r.title ?? "",
      url: r.url ?? "",
      snippet: stripTags(r.description ?? ""),
    }));

    return { query, source: "brave_search", results };
  },
};

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "").trim();
}
