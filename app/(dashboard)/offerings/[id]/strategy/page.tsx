import { Header } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireOrg } from "@/lib/auth/current-org";
import { getStrategyView, type StrategyView } from "@/lib/data/strategy";
import { CHANNEL_LABELS, type ChannelScore, type Channel } from "@/lib/strategy/channel-model";
import { rerunResearch } from "@/lib/actions/offerings";
import { AutoRefresh } from "./auto-refresh";
import { Loader2, RefreshCw, TrendingUp, Zap, DollarSign, ChevronRight, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const RESEARCH_STEPS: Record<string, string> = {
  queued: "Queued…",
  planning: "Planning what to research…",
  gathering: "Searching the web for market signals…",
  extracting: "Reading competitors, reviews, and demand…",
  scoring: "Scoring channel fit…",
  synthesizing: "Writing your strategy…",
};

export default async function StrategyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let view: StrategyView | null = null;
  try {
    const org = await requireOrg();
    view = await getStrategyView(org.id, id);
  } catch {
    // DB not connected
  }

  if (!view) notFound();

  const { offering, research, strategy } = view;
  const isResearching =
    offering.status === "researching" ||
    (research && !["done", "failed"].includes(research.status ?? ""));

  return (
    <div>
      <Header title={offering.name} />
      <div className="p-6 max-w-4xl space-y-6">

        {/* Offering summary */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">{offering.name}</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{offering.description}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Meta v={offering.audienceType} />
              <Meta v={offering.priceBand ? `${offering.priceBand} price` : null} />
              <Meta v={offering.salesCycle ? `${offering.salesCycle} cycle` : null} />
              <Meta v={offering.geoScope} />
            </div>
          </div>
          {!isResearching && (
            <form action={rerunResearch.bind(null, offering.id)}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" /> Re-run
              </Button>
            </form>
          )}
        </div>

        {/* Researching state */}
        {isResearching && (
          <>
            <AutoRefresh />
            <Card>
              <CardContent className="py-12 text-center">
                <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
                <p className="font-medium">{RESEARCH_STEPS[research?.status ?? "queued"] ?? "Researching…"}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Analyzing the market and scoring every channel. This page updates automatically.
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {research?.status === "failed" && (
          <Card className="border-destructive/40">
            <CardContent className="py-6 text-center">
              <p className="text-sm text-destructive">Research failed: {research.error ?? "unknown error"}</p>
              <form action={rerunResearch.bind(null, offering.id)} className="mt-3">
                <Button variant="outline" size="sm">Try again</Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {!isResearching && strategy && (
          <>
            {/* Strategy narrative */}
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-primary" /> Recommended strategy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm leading-relaxed">{strategy.narrative}</p>
                <div className="flex flex-wrap gap-1.5">
                  {strategy.recommended.map((c) => (
                    <Badge key={c} className="text-xs">{CHANNEL_LABELS[c as Channel] ?? c}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Market findings */}
            {research?.summary && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">What the research found</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{research.summary}</p>
                  {research.confidence && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Overall evidence confidence: {Math.round(parseFloat(research.confidence) * 100)}%
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Channel scorecard */}
            <div>
              <h2 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4" /> Channel scorecard
                <span className="font-normal text-xs text-muted-foreground">· every score traces to the evidence</span>
              </h2>
              <div className="space-y-2">
                {strategy.scores.map((s) => (
                  <ChannelRow key={s.channel} score={s} recommended={strategy.recommended.includes(s.channel)} />
                ))}
              </div>
            </div>

            {/* Plays */}
            {strategy.playbookByChannel.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold mb-2">Your first moves</h2>
                <div className="space-y-3">
                  {strategy.playbookByChannel.map((play, i) => (
                    <Card key={i}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">{i + 1}</span>
                          {CHANNEL_LABELS[play.channel as Channel] ?? play.channel}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <p><span className="font-medium">Start with:</span> {play.firstMove}</p>
                        <p><span className="font-medium">Cadence:</span> {play.cadence}</p>
                        <div className="rounded-md bg-muted/50 p-2.5 text-xs">
                          <span className="font-medium">Ready to use:</span> {play.sampleAsset}
                        </div>
                        <p className="text-xs text-muted-foreground italic">{play.whyNow}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {!isResearching && !strategy && research?.status !== "failed" && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No strategy yet.
              <form action={rerunResearch.bind(null, offering.id)} className="mt-3">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" /> Run research
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Meta({ v }: { v: string | null | undefined }) {
  if (!v) return null;
  return (
    <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground capitalize">
      {v.replace(/_/g, " ")}
    </span>
  );
}

function scoreColor(fit: number): string {
  if (fit >= 70) return "bg-green-500";
  if (fit >= 58) return "bg-emerald-400";
  if (fit >= 40) return "bg-amber-400";
  return "bg-muted-foreground/40";
}

function ChannelRow({ score, recommended }: { score: ChannelScore; recommended: boolean }) {
  return (
    <Card className={recommended ? "border-primary/40" : ""}>
      <CardContent className="py-3">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{CHANNEL_LABELS[score.channel]}</span>
              {recommended && <Badge className="text-[10px] h-4">Recommended</Badge>}
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden max-w-xs">
                <div className={`h-full ${scoreColor(score.fitScore)}`} style={{ width: `${score.fitScore}%` }} />
              </div>
              <span className="text-sm font-semibold tabular-nums w-8">{score.fitScore}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{score.rationale}</p>
          </div>
          <div className="shrink-0 text-right text-[11px] text-muted-foreground space-y-0.5">
            <div className="flex items-center gap-1 justify-end"><Zap className="h-3 w-3" /> effort {score.effort}/5</div>
            <div className="flex items-center gap-1 justify-end"><DollarSign className="h-3 w-3" /> cost {score.cost}/5</div>
            <div>conf {Math.round(score.confidence * 100)}%</div>
          </div>
        </div>

        {/* Auditable contribution breakdown */}
        {score.contributions.length > 0 && (
          <details className="mt-2 group">
            <summary className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1">
              <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
              Why this score
            </summary>
            <div className="mt-1.5 space-y-1 pl-4">
              {score.contributions.map((c, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px]">
                  <span className={`tabular-nums font-medium w-9 shrink-0 ${c.points >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {c.points >= 0 ? "+" : ""}{c.points}
                  </span>
                  <span className="text-muted-foreground">
                    <span className="text-foreground">{c.key}</span> — {c.reason}
                    <span className="ml-1 opacity-60">({c.kind})</span>
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
