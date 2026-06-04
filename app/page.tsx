import type { CSSProperties } from "react";
import { loadTenantBySlug, loadQuestionSet } from "@/lib/data";
import { AdvisorApp } from "@/components/advisor-app";

interface PageProps {
  searchParams: Promise<{ tenant?: string }>;
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const slug = params.tenant ?? "homepro";

  const tenant = await loadTenantBySlug(slug);
  const questionSet = await loadQuestionSet(tenant);

  const themeVars: CSSProperties = {
    ["--brand" as string]: tenant.theme.brand,
    ["--brand-foreground" as string]: tenant.theme.brandForeground,
    ["--brand-muted" as string]: tenant.theme.brandMuted,
    ["--accent" as string]: tenant.theme.accent,
  };

  return (
    <div style={themeVars} className="min-h-screen">
      <AdvisorApp tenant={tenant} questionSet={questionSet} />
    </div>
  );
}
