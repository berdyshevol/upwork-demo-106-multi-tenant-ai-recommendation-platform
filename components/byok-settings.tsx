"use client";

import * as React from "react";
import { KeyRound, Eye, EyeOff, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveKey, clearKey, getKeyStatus } from "@/lib/api-client";

interface ByokSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasKey: boolean;
  onKeyChange: (hasKey: boolean) => void;
}

export function ByokSettings({ open, onOpenChange, hasKey, onKeyChange }: ByokSettingsProps) {
  const [keyValue, setKeyValue] = React.useState("");
  const [showKey, setShowKey] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [clearing, setClearing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  // Reset transient state when dialog opens
  React.useEffect(() => {
    if (open) {
      setKeyValue("");
      setShowKey(false);
      setError(null);
      setSaved(false);
    }
  }, [open]);

  async function handleSave() {
    const trimmed = keyValue.trim();
    if (!trimmed.startsWith("sk-")) {
      setError("Key must start with sk-");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await saveKey(trimmed);
    setSaving(false);
    if (!result.ok) {
      setError(result.error ?? "Could not save key");
      return;
    }
    setSaved(true);
    onKeyChange(true);
    setTimeout(() => onOpenChange(false), 800);
  }

  async function handleClear() {
    setClearing(true);
    await clearKey();
    // Confirm status
    const status = await getKeyStatus();
    setClearing(false);
    onKeyChange(status.hasKey);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <KeyRound className="h-5 w-5" />
            </div>
            <DialogTitle>AI Settings</DialogTitle>
          </div>
          <DialogDescription>
            Add your OpenAI key to unlock AI-generated explanations and follow-up chat for each
            recommendation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Status indicator */}
          <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
            {hasKey ? (
              <>
                <CheckCircle2 className="h-4 w-4 shrink-0 text-brand" />
                <span className="text-foreground font-medium">AI key active</span>
                <span className="ml-auto text-muted-foreground">sk-•••••••••</span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">No key set — AI features disabled</span>
              </>
            )}
          </div>

          {/* Key input */}
          <div className="space-y-2">
            <Label htmlFor="openai-key-input">OpenAI API Key</Label>
            <div className="relative">
              <Input
                id="openai-key-input"
                data-testid="openai-key-input"
                type={showKey ? "text" : "password"}
                placeholder="sk-..."
                value={keyValue}
                onChange={(e) => {
                  setKeyValue(e.target.value);
                  setError(null);
                  setSaved(false);
                }}
                className="pr-10"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowKey((v) => !v)}
                aria-label={showKey ? "Hide key" : "Show key"}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            {saved && (
              <p className="text-xs text-brand flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Saved — AI features enabled
              </p>
            )}
          </div>

          {/* Privacy note */}
          <p className="text-xs text-muted-foreground leading-relaxed rounded-lg border border-border/50 bg-muted/20 p-3">
            <span className="font-medium text-foreground/70">Privacy:</span> Your key is stored in
            an encrypted HttpOnly cookie and used only for your session. It is never stored on our
            servers or billed to anyone other than you.
          </p>
        </div>

        <DialogFooter>
          {hasKey && (
            <Button
              variant="ghost"
              size="sm"
              data-testid="clear-key"
              onClick={handleClear}
              disabled={clearing}
              className="mr-auto text-muted-foreground hover:text-destructive"
            >
              {clearing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
              Clear key
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            variant="brand"
            size="sm"
            data-testid="save-key"
            onClick={handleSave}
            disabled={saving || !keyValue.trim()}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
            {saving ? "Saving…" : "Save key"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
