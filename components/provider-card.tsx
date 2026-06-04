"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Star, Clock, MapPin, Zap, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Recommendation } from "@/lib/types";

interface ProviderCardProps {
  recommendation: Recommendation;
  rank: number;
}

const PRICE_TIER_LABELS: Record<number, string> = {
  1: "Budget",
  2: "Mid-range",
  3: "Premium",
  4: "Luxury",
};

// Circumference for r=45 circle: 2π×45 ≈ 282.74 → we use 283
const CIRCUMFERENCE = 283;

export function ProviderCard({ recommendation, rank }: ProviderCardProps) {
  const { provider, score, explanation } = recommendation;
  const [citationsOpen, setCitationsOpen] = React.useState(false);

  const dashOffset = CIRCUMFERENCE - (score.total / 100) * CIRCUMFERENCE;

  const scoreColor =
    score.total >= 80
      ? "hsl(var(--brand))"
      : score.total >= 60
        ? "hsl(var(--accent))"
        : "hsl(var(--muted-foreground))";

  return (
    <div
      data-testid="provider-card"
      className="rounded-xl border border-border bg-card overflow-hidden transition-all duration-200 hover:border-brand/30 hover:shadow-lg hover:shadow-black/20 group"
    >
      {/* Rank stripe */}
      <div
        className="h-0.5 w-full"
        style={{
          background:
            rank === 1
              ? "linear-gradient(90deg, hsl(var(--brand)), hsl(var(--accent)))"
              : "transparent",
        }}
      />

      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          {/* Score ring */}
          <div className="shrink-0 flex flex-col items-center gap-1">
            <div className="relative h-16 w-16">
              <svg
                viewBox="0 0 100 100"
                className="h-full w-full -rotate-90"
                aria-hidden="true"
              >
                {/* Track */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="hsl(var(--border))"
                  strokeWidth="8"
                />
                {/* Progress */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke={scoreColor}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={dashOffset}
                  className="score-ring"
                  style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)" }}
                />
              </svg>
              {/* Numeric score — textContent readable by tests */}
              <div
                className="absolute inset-0 flex items-center justify-center"
                data-testid="match-score"
                aria-label={`Match score: ${Math.round(score.total)}`}
              >
                <span className="text-lg font-bold leading-none" style={{ color: scoreColor }}>
                  {Math.round(score.total)}
                </span>
              </div>
            </div>
            {rank === 1 && (
              <span className="text-[10px] font-semibold text-brand tracking-wider uppercase">
                Top Pick
              </span>
            )}
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Header row */}
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <h3
                  className="font-semibold text-foreground text-base leading-tight"
                  data-testid="provider-name"
                >
                  {provider.name}
                </h3>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    {provider.rating.toFixed(1)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {provider.response_time_hours}h response
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {provider.service_areas.slice(0, 2).join(", ")}
                  </span>
                  {provider.available_emergency && (
                    <span className="flex items-center gap-1 text-brand font-medium">
                      <Zap className="h-3 w-3" />
                      Emergency
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="secondary" className="text-xs">
                  {PRICE_TIER_LABELS[provider.price_tier] ?? "—"}
                </Badge>
                <Badge variant="brand" className="text-xs">
                  {provider.years_experience}y exp
                </Badge>
              </div>
            </div>

            {/* Blurb */}
            <p className="text-sm text-muted-foreground leading-relaxed">{provider.blurb}</p>

            {/* Services */}
            <div className="flex flex-wrap gap-1.5">
              {provider.services.map((s) => (
                <Badge key={s} variant="outline" className="text-xs">
                  {s}
                </Badge>
              ))}
            </div>

            {/* Score reasons */}
            <div className="space-y-1.5">
              {score.reasons.map((reason, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand/50" />
                  {reason}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Explanation — only when present */}
        {explanation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            data-testid="ai-explanation"
            className="mt-5 rounded-lg border border-brand/20 bg-brand/5 p-4 space-y-3"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-brand uppercase tracking-wider">
              <BookOpen className="h-3.5 w-3.5" />
              Why it fits
            </div>

            <p className="text-sm text-foreground/90 leading-relaxed">{explanation.whyItFits}</p>

            {explanation.standoutFactors.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {explanation.standoutFactors.map((f, i) => (
                  <Badge key={i} variant="accent" className="text-xs">
                    {f}
                  </Badge>
                ))}
              </div>
            )}

            {/* Citations toggle */}
            {explanation.citations.length > 0 && (
              <div>
                <button
                  type="button"
                  data-testid="citations-toggle"
                  className="flex items-center gap-1.5 text-xs text-brand/70 hover:text-brand transition-colors"
                  onClick={() => setCitationsOpen((v) => !v)}
                >
                  {citationsOpen ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                  {explanation.citations.length} source{explanation.citations.length !== 1 ? "s" : ""}
                </button>

                {citationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-2 space-y-2"
                  >
                    {explanation.citations.map((cit) => (
                      <div
                        key={cit.chunkId}
                        data-testid="citation"
                        className="rounded-md border border-border/50 bg-muted/30 px-3 py-2"
                      >
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          {cit.source}
                        </p>
                        <p className="text-xs text-foreground/70 leading-relaxed italic">
                          "{cit.snippet}"
                        </p>
                      </div>
                    ))}
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
