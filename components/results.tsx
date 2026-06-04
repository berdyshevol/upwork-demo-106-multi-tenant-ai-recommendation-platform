"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { MessageSquare, KeyRound, Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProviderCard } from "@/components/provider-card";
import type { Recommendation } from "@/lib/types";

interface ResultsProps {
  recommendations: Recommendation[];
  aiEnabled: boolean;
  loading: boolean;
  onOpenChat: () => void;
  onOpenSettings: () => void;
  onReset: () => void;
}

export function Results({
  recommendations,
  aiEnabled,
  loading,
  onOpenChat,
  onOpenSettings,
  onReset,
}: ResultsProps) {
  if (loading) {
    return <ResultsSkeleton />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      data-testid="results"
      className="w-full max-w-2xl mx-auto space-y-6"
    >
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {recommendations.length} Match{recommendations.length !== 1 ? "es" : ""} Found
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Ranked by fit score — highest first
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onReset} className="gap-1.5 text-muted-foreground">
            <ArrowLeft className="h-3.5 w-3.5" />
            Edit answers
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenChat}
            data-testid="open-chat"
            className="gap-1.5"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Ask follow-up
          </Button>
        </div>
      </div>

      {/* BYOK hint — only when AI is OFF */}
      {!aiEnabled && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          data-testid="byok-hint"
          className="flex items-center gap-3 rounded-xl border border-brand/20 bg-brand/5 px-5 py-4"
        >
          <Sparkles className="h-5 w-5 shrink-0 text-brand" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">Unlock AI explanations & chat</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add your OpenAI key to get a personalised "Why it fits" analysis for each provider
              and ask follow-up questions.
            </p>
          </div>
          <Button
            variant="brand"
            size="sm"
            onClick={onOpenSettings}
            className="shrink-0 gap-1.5"
          >
            <KeyRound className="h-3.5 w-3.5" />
            Add key
          </Button>
        </motion.div>
      )}

      {/* Provider cards with stagger */}
      <div className="space-y-4">
        {recommendations.map((rec, i) => (
          <motion.div
            key={rec.provider.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.45,
              delay: i * 0.08,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <ProviderCard recommendation={rec} rank={i + 1} />
          </motion.div>
        ))}
      </div>

      {/* Bottom chat CTA */}
      {recommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: recommendations.length * 0.08 + 0.2 }}
          className="text-center pt-2 pb-4"
        >
          <Button
            variant="outline"
            size="lg"
            onClick={onOpenChat}
            className="gap-2 border-brand/20 hover:border-brand/40"
          >
            <MessageSquare className="h-4 w-4 text-brand" />
            Have questions? Ask the AI advisor
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ── Loading skeleton ─────────────────────────────────────────────────── */

function ResultsSkeleton() {
  return (
    <div className="w-full max-w-2xl mx-auto space-y-4" aria-busy="true" aria-label="Loading recommendations">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-52" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-3">
          <div className="flex items-start gap-4">
            <Skeleton className="h-16 w-16 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-12 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-14 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
