import { resolveSearchSource, resolveFetchSource } from "./sources";
import type { SearchResult } from "./types";

export interface GatheredCorpus {
  searchSource: string;
  queries: string[];
  results: SearchResult[]; // deduped across queries
  pages: Array<{ url: string; title?: string; text: string }>;
  sources: Array<{ url: string; source: string; fetchedAt: string }>;
}

interface GatherOptions {
  /** How many organic results to keep per query. */
  perQuery?: number;
  /** How many unique pages to actually fetch full text for. */
  maxPages?: number;
}

/**
 * Executes a research plan's queries against the active search adapter, dedupes
 * results, and fetches the most relevant pages for full-text extraction.
 * Deterministic tool execution — the "hands" the agent's plan drives.
 */
export async function gather(
  queries: string[],
  opts: GatherOptions = {}
): Promise<GatheredCorpus> {
  const perQuery = opts.perQuery ?? 6;
  const maxPages = opts.maxPages ?? 6;

  const search = resolveSearchSource();
  const fetcher = resolveFetchSource();

  const seen = new Set<string>();
  const results: SearchResult[] = [];

  for (const q of queries) {
    try {
      const resp = await search.search(q, { count: perQuery });
      for (const r of resp.results) {
        if (!r.url || seen.has(r.url)) continue;
        seen.add(r.url);
        results.push(r);
      }
    } catch {
      // one bad query shouldn't sink the run; keep going
    }
  }

  // Fetch full text for the top unique results (search order ≈ relevance).
  const toFetch = results.slice(0, maxPages);
  const pages: GatheredCorpus["pages"] = [];
  const sources: GatheredCorpus["sources"] = [];

  const fetched = await Promise.all(toFetch.map((r) => fetcher.fetchPage(r.url)));
  for (const p of fetched) {
    sources.push({ url: p.url, source: fetcher.name, fetchedAt: p.fetchedAt });
    if (p.ok && p.text) {
      pages.push({ url: p.url, title: p.title, text: p.text });
    }
  }

  return {
    searchSource: search.name,
    queries,
    results,
    pages,
    sources,
  };
}
