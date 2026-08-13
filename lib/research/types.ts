/**
 * The pluggable data-source layer for market research.
 *
 * Everything the gather stage touches goes through these interfaces, so the
 * free web adapters (Brave / DuckDuckGo / raw fetch) and future paid adapters
 * (Ahrefs, SEMrush, Apollo) are interchangeable. Swapping data quality never
 * touches the orchestrator, extractor, or scoring model.
 */

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchResponse {
  query: string;
  source: string; // adapter name that produced these
  results: SearchResult[];
}

export interface FetchedPage {
  url: string;
  title?: string;
  text: string; // plain-text content (HTML stripped)
  fetchedAt: string; // ISO
  ok: boolean;
  error?: string;
}

interface BaseSource {
  /** Stable adapter id, e.g. "brave_search". Used as the `source` on signals. */
  readonly name: string;
  /** Cost tier — lets the orchestrator prefer free sources. */
  readonly tier: "free" | "paid";
  /** True if the adapter has the config it needs to run (e.g. an API key). */
  available(): boolean;
}

export interface SearchSource extends BaseSource {
  readonly kind: "search";
  search(query: string, opts?: { count?: number }): Promise<SearchResponse>;
}

export interface FetchSource extends BaseSource {
  readonly kind: "fetch";
  fetchPage(url: string): Promise<FetchedPage>;
}

export type SignalSource = SearchSource | FetchSource;
