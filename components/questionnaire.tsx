"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Answers, Question, QuestionSet } from "@/lib/types";

interface QuestionnaireProps {
  questionSet: QuestionSet;
  onSubmit: (answers: Answers) => void;
  loading: boolean;
}

export function Questionnaire({ questionSet, onSubmit, loading }: QuestionnaireProps) {
  const [answers, setAnswers] = React.useState<Answers>({});

  function setAnswer(key: string, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function toggleMulti(key: string, value: string) {
    setAnswers((prev) => {
      const current = (prev[key] as string[] | undefined) ?? [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [key]: next };
    });
  }

  const allRequired = questionSet.questions
    .filter((q) => q.required)
    .every((q) => {
      const ans = answers[q.key];
      if (q.type === "multiselect") return Array.isArray(ans) && ans.length > 0;
      return typeof ans === "string" && ans !== "";
    });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allRequired || loading) return;
    onSubmit(answers);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      data-testid="questionnaire"
      className="w-full max-w-2xl mx-auto"
    >
      {/* Hero prompt */}
      <div className="text-center mb-10 space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/5 px-4 py-1.5 text-xs text-brand font-medium mb-2">
          <Sparkles className="h-3.5 w-3.5" />
          Tell us what you need
        </div>
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
          Find your perfect match
        </h2>
        <p className="text-muted-foreground text-base max-w-md mx-auto">
          Answer a few quick questions and we'll rank providers using AI-powered scoring.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {questionSet.questions.map((question, i) => (
          <motion.div
            key={question.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
            data-testid={`question-${question.key}`}
            className="rounded-xl border border-border bg-card p-5 space-y-3"
          >
            <div>
              <p className="font-medium text-foreground">{question.label}</p>
              {question.help && (
                <p className="text-xs text-muted-foreground mt-0.5">{question.help}</p>
              )}
            </div>

            {question.type === "select" ? (
              <SelectQuestion
                question={question}
                value={(answers[question.key] as string) ?? ""}
                onChange={(v) => setAnswer(question.key, v)}
              />
            ) : (
              <MultiSelectQuestion
                question={question}
                values={(answers[question.key] as string[]) ?? []}
                onToggle={(v) => toggleMulti(question.key, v)}
              />
            )}
          </motion.div>
        ))}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: questionSet.questions.length * 0.07 + 0.1 }}
          className="pt-2"
        >
          <Button
            type="submit"
            variant="brand"
            size="xl"
            className="w-full"
            disabled={!allRequired || loading}
            data-testid="get-recommendations"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Finding your matches…
              </>
            ) : (
              <>
                Get Recommendations
                <ChevronRight className="h-5 w-5" />
              </>
            )}
          </Button>
        </motion.div>
      </form>
    </motion.div>
  );
}

/* ── Select (radio-style buttons) ─────────────────────────────────────── */

function SelectQuestion({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {question.options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            data-testid={`option-${question.key}-${opt.value}`}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex items-center gap-2.5 rounded-lg border px-4 py-3 text-sm text-left",
              "transition-all duration-150 cursor-pointer",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected
                ? "border-brand bg-brand/10 text-brand font-medium shadow-sm shadow-brand/10"
                : "border-border bg-background/50 text-foreground hover:border-brand/40 hover:bg-muted/60",
            )}
            aria-pressed={selected}
          >
            <span
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                selected ? "border-brand" : "border-muted-foreground/40",
              )}
            >
              <AnimatePresence>
                {selected && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ duration: 0.15 }}
                    className="h-2 w-2 rounded-full bg-brand"
                  />
                )}
              </AnimatePresence>
            </span>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Multi-select (toggle chips) ──────────────────────────────────────── */

function MultiSelectQuestion({
  question,
  values,
  onToggle,
}: {
  question: Question;
  values: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {question.options.map((opt) => {
        const selected = values.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            data-testid={`option-${question.key}-${opt.value}`}
            onClick={() => onToggle(opt.value)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium",
              "transition-all duration-150 cursor-pointer",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected
                ? "border-brand bg-brand/10 text-brand shadow-sm shadow-brand/10 scale-[1.02]"
                : "border-border bg-transparent text-muted-foreground hover:border-brand/40 hover:text-foreground",
            )}
            aria-pressed={selected}
          >
            {selected && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mr-1.5 inline-block"
              >
                ✓
              </motion.span>
            )}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
