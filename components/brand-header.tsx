"use client";

import * as React from "react";
import { Settings2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Tenant } from "@/lib/types";

interface BrandHeaderProps {
  tenant: Tenant;
  onOpenSettings: () => void;
  hasKey: boolean;
}

const TENANTS = [
  { slug: "homepro", name: "HomePro", emoji: "🔧" },
  { slug: "evently", name: "Evently", emoji: "🎉" },
];

export function BrandHeader({ tenant, onOpenSettings, hasKey }: BrandHeaderProps) {
  const [switcherOpen, setSwitcherOpen] = React.useState(false);

  return (
    <header className="relative z-10 border-b border-border/50">
      {/* Subtle brand-tinted top line */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, hsl(var(--brand)/0.6), transparent)" }}
      />

      <div className="container flex h-16 items-center justify-between gap-4">
        {/* Logo + wordmark */}
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xl"
            style={{ background: "hsl(var(--brand-muted))" }}
            aria-hidden="true"
          >
            {tenant.logo_emoji}
          </span>
          <div className="min-w-0">
            <h1
              className="font-semibold text-foreground leading-tight truncate"
              data-testid="brand-name"
            >
              {tenant.name}
            </h1>
            <p className="text-xs text-muted-foreground leading-tight truncate hidden sm:block">
              {tenant.tagline}
            </p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Tenant switcher */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-foreground text-xs"
              onClick={() => setSwitcherOpen((v) => !v)}
              aria-label="Switch tenant"
              aria-expanded={switcherOpen}
            >
              Switch tenant
              <ChevronDown
                className={`h-3 w-3 transition-transform duration-200 ${switcherOpen ? "rotate-180" : ""}`}
              />
            </Button>

            {switcherOpen && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setSwitcherOpen(false)}
                />
                {/* Dropdown */}
                <div className="absolute right-0 top-full mt-1.5 z-50 w-44 rounded-lg border border-border bg-card shadow-xl shadow-black/30 overflow-hidden">
                  {TENANTS.map((t) => (
                    <a
                      key={t.slug}
                      href={`?tenant=${t.slug}`}
                      onClick={() => setSwitcherOpen(false)}
                      className={[
                        "flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors",
                        t.slug === tenant.slug
                          ? "bg-brand/10 text-brand font-medium"
                          : "text-foreground hover:bg-muted",
                      ].join(" ")}
                    >
                      <span>{t.emoji}</span>
                      {t.name}
                      {t.slug === tenant.slug && (
                        <span className="ml-auto text-xs text-brand/60">active</span>
                      )}
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Settings / AI key button */}
          <Button
            variant="outline"
            size="icon-sm"
            onClick={onOpenSettings}
            data-testid="open-settings"
            aria-label="AI settings"
            className={hasKey ? "border-brand/30 text-brand hover:bg-brand/10" : ""}
            title={hasKey ? "AI key active" : "Add OpenAI key to enable AI features"}
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
