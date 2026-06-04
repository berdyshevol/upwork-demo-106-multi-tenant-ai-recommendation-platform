"use client";

import * as React from "react";
import { BrandHeader } from "@/components/brand-header";
import { Questionnaire } from "@/components/questionnaire";
import { Results } from "@/components/results";
import { ChatPanel } from "@/components/chat-panel";
import { ByokSettings } from "@/components/byok-settings";
import { fetchRecommendations, getKeyStatus } from "@/lib/api-client";
import type { Answers, QuestionSet, Recommendation, Tenant } from "@/lib/types";

interface AdvisorAppProps {
  tenant: Tenant;
  questionSet: QuestionSet;
}

type Step = "questionnaire" | "results";

export function AdvisorApp({ tenant, questionSet }: AdvisorAppProps) {
  const [step, setStep] = React.useState<Step>("questionnaire");
  const [answers, setAnswers] = React.useState<Answers>({});
  const [recommendations, setRecommendations] = React.useState<Recommendation[]>([]);
  const [aiEnabled, setAiEnabled] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [hasKey, setHasKey] = React.useState(false);

  const [chatOpen, setChatOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  // Check key status on mount
  React.useEffect(() => {
    getKeyStatus().then(({ hasKey: hk }) => setHasKey(hk));
  }, []);

  async function handleSubmit(newAnswers: Answers) {
    setAnswers(newAnswers);
    setLoading(true);
    setStep("results");

    try {
      const result = await fetchRecommendations(tenant.slug, newAnswers);
      setRecommendations(result.recommendations);
      setAiEnabled(result.aiEnabled);
    } catch {
      // Even on error, stay on results with empty list
      setRecommendations([]);
      setAiEnabled(false);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setStep("questionnaire");
    setRecommendations([]);
    setAiEnabled(false);
  }

  function handleKeyChange(newHasKey: boolean) {
    setHasKey(newHasKey);
    // If we're on results and AI just got enabled, re-fetch
    if (newHasKey && step === "results" && Object.keys(answers).length > 0) {
      void handleSubmit(answers);
    }
  }

  const providerIds = recommendations.map((r) => r.provider.id);

  return (
    <div className="flex flex-col min-h-screen">
      <BrandHeader
        tenant={tenant}
        onOpenSettings={() => setSettingsOpen(true)}
        hasKey={hasKey}
      />

      <main className="flex-1 container py-10 sm:py-14">
        {step === "questionnaire" ? (
          <Questionnaire
            questionSet={questionSet}
            onSubmit={handleSubmit}
            loading={loading}
          />
        ) : (
          <Results
            recommendations={recommendations}
            aiEnabled={aiEnabled}
            loading={loading}
            onOpenChat={() => setChatOpen(true)}
            onOpenSettings={() => setSettingsOpen(true)}
            onReset={handleReset}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-5">
        <div className="container flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
          <span>
            Powered by{" "}
            <span className="text-brand font-medium">Adviso</span>
            {" — "}deterministic scoring + optional AI layer
          </span>
          <span>Multi-tenant · {tenant.name}</span>
        </div>
      </footer>

      {/* Dialogs */}
      <ChatPanel
        open={chatOpen}
        onOpenChange={setChatOpen}
        tenant={tenant}
        providerIds={providerIds}
        onOpenSettings={() => {
          setChatOpen(false);
          setSettingsOpen(true);
        }}
      />

      <ByokSettings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        hasKey={hasKey}
        onKeyChange={handleKeyChange}
      />
    </div>
  );
}
