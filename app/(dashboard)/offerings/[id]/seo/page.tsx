"use client";

import { useState, use } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { KeywordClusters } from "@/lib/seo/keyword-clusters";
import type { ContentBrief } from "@/lib/seo/content-brief";
import { Search, FileText, Loader2, Sparkles, ArrowLeft } from "lucide-react";
import Link from "next/link";

const INTENT_COLOR: Record<string, string> = {
  transactional: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300",
  commercial: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  informational: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  navigational: "bg-muted text-muted-foreground",
};
const PRIORITY_COLOR: Record<string, string> = {
  high: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  low: "bg-muted text-muted-foreground",
};

export default function SeoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tab, setTab] = useState<"keywords" | "brief">("keywords");

  return (
    <div className="p-6 max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href={`/offerings/${id}/strategy`}>
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Strategy
          </Button>
        </Link>
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" /> SEO Toolkit
        </h1>
      </div>

      <div className="flex gap-2">
        <TabButton active={tab === "keywords"} onClick={() => setTab("keywords")} icon={Search}>Keyword map</TabButton>
        <TabButton active={tab === "brief"} onClick={() => setTab("brief")} icon={FileText}>Content brief</TabButton>
      </div>

      {tab === "keywords" ? <KeywordTool offeringId={id} /> : <BriefTool offeringId={id} />}
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, children }: {
  active: boolean; onClick: () => void; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
      }`}
    >
      <Icon className="h-3.5 w-3.5" /> {children}
    </button>
  );
}

function KeywordTool({ offeringId }: { offeringId: string }) {
  const [data, setData] = useState<KeywordClusters | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/seo/keyword-clusters", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offeringId }),
      });
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch { setError("Failed to generate. Try again."); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      {!data && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Generate a keyword-cluster map: what to write, grouped by search intent and priority.
            </p>
            <Button onClick={run} disabled={loading} className="gap-2">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</> : <><Sparkles className="h-4 w-4" /> Generate keyword map</>}
            </Button>
            {error && <p className="text-sm text-destructive mt-3">{error}</p>}
          </CardContent>
        </Card>
      )}

      {data?.clusters.map((c, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-sm">{c.name}</CardTitle>
              <Badge className={`text-[10px] ${INTENT_COLOR[c.intent]}`}>{c.intent}</Badge>
              <Badge className={`text-[10px] ${PRIORITY_COLOR[c.priority]}`}>{c.priority} priority</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {c.keywords.map((k, j) => (
                <span key={j} className="rounded bg-muted px-2 py-0.5 text-xs">{k}</span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Best format: {c.contentType}</p>
          </CardContent>
        </Card>
      ))}

      {data && (
        <Button variant="outline" onClick={run} disabled={loading} className="w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Regenerate"}
        </Button>
      )}
    </div>
  );
}

function BriefTool({ offeringId }: { offeringId: string }) {
  const [topic, setTopic] = useState("");
  const [brief, setBrief] = useState<ContentBrief | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!topic.trim()) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/seo/content-brief", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offeringId, topic }),
      });
      if (!res.ok) throw new Error();
      setBrief(await res.json());
    } catch { setError("Failed to generate. Try again."); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-5 space-y-3">
          <p className="text-sm font-medium">Generate a ready-to-write content brief</p>
          <div className="flex gap-2">
            <Input
              placeholder="Target topic or keyword, e.g. 'how to choose a CRM'"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && run()}
            />
            <Button onClick={run} disabled={loading || !topic.trim()} className="gap-1.5 shrink-0">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Brief
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {brief && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{brief.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <Info label="Target keyword" value={brief.targetKeyword} />
              <Info label="Word count" value={`~${brief.suggestedWordCount}`} />
            </div>
            <Info label="Search intent" value={brief.searchIntent} />
            <Info label="Meta description" value={brief.metaDescription} />

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Outline</p>
              <div className="space-y-2">
                {brief.outline.map((s, i) => (
                  <div key={i}>
                    <p className="font-medium">{s.heading}</p>
                    <ul className="list-disc list-inside text-muted-foreground text-xs mt-0.5 space-y-0.5">
                      {s.points.map((pt, j) => <li key={j}>{pt}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Questions to answer</p>
              <ul className="list-disc list-inside text-muted-foreground text-xs space-y-0.5">
                {brief.questionsToAnswer.map((q, i) => <li key={i}>{q}</li>)}
              </ul>
            </div>

            {brief.secondaryKeywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {brief.secondaryKeywords.map((k, i) => (
                  <span key={i} className="rounded bg-muted px-2 py-0.5 text-xs">{k}</span>
                ))}
              </div>
            )}

            <div className="rounded-md bg-primary/5 border border-primary/20 p-2.5 text-xs">
              <span className="font-medium">CTA:</span> {brief.cta}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="mt-0.5">{value}</p>
    </div>
  );
}
