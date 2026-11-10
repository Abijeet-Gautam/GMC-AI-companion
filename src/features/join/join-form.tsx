"use client";
import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Sparkles,
  ShieldCheck,
  Sprout,
  LoaderCircle,
} from "lucide-react";
import { themes, themeFor, type Theme, type Leaf } from "@/lib/catalog";
import { Button } from "@/components/ui/button";
import { ThemeIcon } from "@/components/theme-icon";
import { LeafResult } from "@/features/leaf/leaf-result";
import { uuid, api } from "@/lib/client";
export function JoinForm({ initialTheme }: { initialTheme?: Theme }) {
  const [theme, setTheme] = useState<Theme>(initialTheme || "nature"),
    [step, setStep] = useState(0),
    [aspiration, setAspiration] = useState("");
  const [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [leaf, setLeaf] = useState<Leaf | null>(null);
  const key = useRef<string | null>(null),
    lock = useRef(false);
  function edit(text: string) {
    setAspiration(text);
    setError("");
    key.current = null;
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    key.current ??= uuid();
    try {
      const data = await api<{ leaf: Leaf }>("/api/contributions", {
        method: "POST",
        body: JSON.stringify({
          aspiration,
          theme,
          consent,
          idempotencyKey: key.current,
        }),
        signal: AbortSignal.timeout(30000),
      });
      setLeaf(data.leaf);
      setAspiration("");
      setStep(2);
    } catch (err) {
      setError(
        err instanceof Error && err.name === "TimeoutError"
          ? "This is taking longer than expected. Retry to recover your leaf safely."
          : err instanceof Error
            ? err.message
            : "Please try again.",
      );
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  if (leaf)
    return (
      <div className="mx-auto max-w-xl">
        <LeafResult leaf={leaf} />
        <Button
          className="mt-6 w-full"
          variant="outline"
          onClick={() => {
            key.current = null;
            setLeaf(null);
            setConsent(false);
            setStep(0);
          }}
        >
          Grow another hope <Sprout size={16} />
        </Button>
      </div>
    );
  return (
    <div className="grid gap-12 md:grid-cols-[.8fr_1.2fr] md:gap-20">
      <aside>
        <Link
          href="/"
          className="mb-10 inline-flex min-h-11 items-center gap-2 text-xs text-foreground/55"
        >
          <ArrowLeft size={14} />
          Back to the tree
        </Link>
        <p className="eyebrow mb-5 text-[#8b7749]">Your voice belongs here</p>
        <h1 className="text-5xl leading-[1.1] tracking-[-.04em] md:text-6xl">
          A little hope.
          <br />A living <em>future.</em>
        </h1>
        <p className="mt-6 max-w-xs text-sm leading-relaxed text-foreground/60">
          Take a moment to imagine the city you want to see. We'll help your
          hope find its branch.
        </p>
        <div className="mt-10 flex items-center gap-3 border-t border-border pt-6 text-xs text-foreground/55">
          <ShieldCheck size={18} strokeWidth={1.4} />
          <span>
            Anonymous by design.
            <br />
            No name or account needed.
          </span>
        </div>
      </aside>
      <section className="min-w-0">
        <ol aria-label="Your progress" className="mb-9 flex gap-2">
          {["Choose a theme", "Share your hope", "Watch it grow"].map(
            (label, index) => (
              <li key={label} className="flex-1">
                <div
                  className={`mb-2 h-0.5 rounded-full ${index <= step ? "bg-primary" : "bg-border"}`}
                />
                <span
                  className={`text-[10px] ${index === step ? "text-foreground" : "text-foreground/45"}`}
                >
                  {index + 1}. {label}
                </span>
              </li>
            ),
          )}
        </ol>
        {step === 0 ? (
          <div className="soft-in">
            <h2 className="mb-2 text-3xl">What matters to you?</h2>
            <p className="mb-6 text-sm text-foreground/60">
              Choose a branch for your hope.
            </p>
            <fieldset>
              <legend className="sr-only">Choose a theme</legend>
              <div className="grid grid-cols-2 gap-3">
                {themes.map((item) => (
                  <label
                    key={item.id}
                    className={`relative flex min-h-32 cursor-pointer flex-col justify-between rounded-xl border p-4 transition-all ${theme === item.id ? "border-primary bg-[#e9eee2] shadow-sm" : "border-border bg-white/40 hover:border-[#8caa91]"}`}
                  >
                    <input
                      className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                      type="radio"
                      name="theme"
                      checked={theme === item.id}
                      onChange={() => {
                        setTheme(item.id);
                        key.current = null;
                      }}
                    />
                    <span className="flex justify-between">
                      <ThemeIcon theme={item.id} size={23} />
                      {theme === item.id ? (
                        <Check size={16} />
                      ) : (
                        <span className="h-4 w-4 rounded-full border border-border" />
                      )}
                    </span>
                    <span className="mt-4 text-xs leading-relaxed peer-focus-visible:underline">
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <Button onClick={() => setStep(1)} className="mt-7 w-full">
              Continue <ArrowRight size={16} />
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="soft-in space-y-5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 rounded-full bg-muted px-3 py-2 text-xs">
                <ThemeIcon theme={theme} size={15} />
                {themeFor(theme).short}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => setStep(0)}
                className="min-h-11 text-xs underline underline-offset-4"
              >
                Change theme
              </button>
            </div>
            <div>
              <h2 className="mb-3 text-3xl">
                <label htmlFor="aspiration">What is your hope for GMC?</label>
              </h2>
              <p className="mb-5 text-sm text-foreground/60">
                One sentence can be the start of something beautiful.
              </p>
              <textarea
                id="aspiration"
                required
                minLength={3}
                maxLength={200}
                rows={5}
                value={aspiration}
                disabled={busy}
                onChange={(event) => edit(event.target.value)}
                placeholder="I hope our city…"
                aria-describedby="aspiration-help"
                className="w-full resize-none rounded-xl border border-border bg-white/70 p-5 text-base leading-relaxed placeholder:text-foreground/35 focus:border-primary focus:outline-none disabled:opacity-60"
              />
              <div
                id="aspiration-help"
                className="mt-2 flex justify-between gap-4 text-[10px] text-foreground/55"
              >
                <span>
                  Keep names, contact details and links out of your hope.
                </span>
                <span className="shrink-0">{aspiration.length} / 200</span>
              </div>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => edit(themeFor(theme).prompt)}
              className="flex min-h-11 w-full items-start gap-3 rounded-xl border border-dashed border-border px-4 py-3 text-left text-xs leading-relaxed text-foreground/65"
            >
              <Sparkles size={16} className="mt-0.5 shrink-0" />
              <span>
                Need a little inspiration?
                <span className="mt-1 block text-foreground">
                  {themeFor(theme).prompt}
                </span>
              </span>
            </button>
            <label className="flex min-h-11 items-start gap-3 text-xs leading-relaxed">
              <input
                type="checkbox"
                required
                checked={consent}
                disabled={busy}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 accent-[#214e3b]"
              />
              <span>
                I agree that my approved, anonymous leaf can appear on the
                shared tree, a public keepsake and collective reflections.{" "}
                <Link href="/privacy" className="underline underline-offset-2">
                  How it works
                </Link>
              </span>
            </label>
            <p className="text-[10px] leading-relaxed text-foreground/50">
              When AI is enabled, your words are sent to OpenAI for
              interpretation and safety checks. If unavailable, a curated leaf
              is chosen using your theme and keywords. Your original words are
              not stored.
            </p>
            {error && (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs leading-relaxed text-red-800"
              >
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={busy || !consent || aspiration.trim().length < 3}
              className="w-full"
              size="lg"
            >
              {busy ? (
                <>
                  <LoaderCircle size={18} className="orbit" />
                  Finding your branch…
                </>
              ) : (
                <>
                  Grow my leaf <Sprout size={18} />
                </>
              )}
            </Button>
            {busy && (
              <p
                role="status"
                className="text-center text-xs text-foreground/60"
              >
                Reflecting on your hope and making it safe to share.
              </p>
            )}
          </form>
        )}
      </section>
    </div>
  );
}
