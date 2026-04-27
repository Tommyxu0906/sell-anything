// Apollo.io People Search API
// Docs: https://apolloio.github.io/apollo-api-docs/?shell#people-search

const APOLLO_BASE = "https://api.apollo.io/v1";

export interface ApolloPersonResult {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  title: string | null;
  linkedin_url: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  organization?: {
    id: string;
    name: string;
    website_url: string | null;
    linkedin_url: string | null;
    industry: string | null;
    estimated_num_employees: number | null;
  };
}

interface SearchParams {
  jobTitles: string[];
  industries: string[];
  companySizeMin?: number;
  companySizeMax?: number;
  page?: number;
  perPage?: number;
}

export async function searchPeople(params: SearchParams): Promise<ApolloPersonResult[]> {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) throw new Error("APOLLO_API_KEY not configured");

  const body = {
    api_key: apiKey,
    page: params.page ?? 1,
    per_page: params.perPage ?? 25,
    person_titles: params.jobTitles,
    organization_industry_tag_ids: [], // populated below
    organization_num_employees_ranges: buildSizeRange(params.companySizeMin, params.companySizeMax),
    // Apollo uses keyword search for industries
    q_organization_keyword_tags: params.industries,
    contact_email_status: ["verified", "likely to engage"],
  };

  const res = await fetch(`${APOLLO_BASE}/mixed_people/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Apollo API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return (data.people ?? []) as ApolloPersonResult[];
}

function buildSizeRange(min?: number, max?: number): string[] {
  // Apollo uses ranges like "1,10" "11,50" "51,200" "201,500" "501,1000" "1001,5000" "5001,10000" "10001,25000" "25001,50000" "50001,100000"
  if (!min && !max) return [];

  const ranges = [
    [1, 10], [11, 50], [51, 200], [201, 500],
    [501, 1000], [1001, 5000], [5001, 10000],
  ];

  return ranges
    .filter(([lo, hi]) => {
      if (min && hi < min) return false;
      if (max && lo > max) return false;
      return true;
    })
    .map(([lo, hi]) => `${lo},${hi}`);
}

// Enrich a single person by email (to get phone, more detail)
export async function enrichPerson(email: string): Promise<ApolloPersonResult | null> {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) return null;

  const res = await fetch(`${APOLLO_BASE}/people/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey, email }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.person ?? null;
}
