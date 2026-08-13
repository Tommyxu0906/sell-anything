import type { SearchSource, FetchSource } from "../types";
import { braveSearch } from "./brave-search";
import { duckduckgo } from "./duckduckgo";
import { pageFetch } from "./page-fetch";

/**
 * Resolves the active search adapter. Prefers Brave (higher quality) when its
 * key is configured, otherwise falls back to the keyless DuckDuckGo scraper so
 * the pipeline always has a real source. Paid adapters register here later
 * without changing any caller.
 */
export function resolveSearchSource(): SearchSource {
  const candidates: SearchSource[] = [braveSearch, duckduckgo];
  return candidates.find((s) => s.available()) ?? duckduckgo;
}

export function resolveFetchSource(): FetchSource {
  return pageFetch;
}

export { braveSearch, duckduckgo, pageFetch };
