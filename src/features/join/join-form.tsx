"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Sparkles,
  Sprout,
  LoaderCircle,
} from "lucide-react";
import {
  themes,
  themeFor,
  type Theme,
  type Leaf,
  type ContributionReceipt,
} from "@/lib/catalog";
import { Button } from "@/components/ui/button";
import { ThemeIcon } from "@/components/theme-icon";
import { LeafResult } from "@/features/leaf/leaf-result";
import { uuid, api } from "@/lib/client";
import { themeSchema } from "@/lib/schemas";
import { VisitorAccess } from "./visitor-access";
export function JoinForm({ initialTheme }: { initialTheme?: Theme }) {
  const section = useRef<HTMLElement>(null);
  const [hydrated, setHydrated] = useState(false),
    [online, setOnline] = useState(true),
    [paused, setPaused] = useState(false),
    [recovered, setRecovered] = useState(false);
  const [theme, setTheme] = useState<Theme>(initialTheme || "nature"),
    [step, setStep] = useState(0),
    [aspiration, setAspiration] = useState("");
  const [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [leaf, setLeaf] = useState<Leaf | null>(null);
  const [replyMode, setReplyMode] = useState<"openai" | "offline">("offline");
  const [visitorType, setVisitorType] = useState<"first" | "returning">(
    "first",
  );
  const [showHistory, setShowHistory] = useState(false);
  const [reply, setReply] = useState(""),
    [original, setOriginal] = useState("");
  const key = useRef<string | null>(null),
    lock = useRef(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(
        sessionStorage.getItem("gmc-hope-draft") || "null",
      );
      if (
        saved &&
        typeof saved.aspiration === "string" &&
        saved.aspiration.length <= 200 &&
        themeSchema.safeParse(saved.theme).success
      ) {
        setAspiration(saved.aspiration);
        setTheme(initialTheme || saved.theme);
        setStep(saved.aspiration ? 1 : 0);
        setRecovered(Boolean(saved.aspiration));
        // Never re-use the previous key when a theme shortcut changes intent.
        if (!initialTheme || initialTheme === saved.theme)
          key.current = typeof saved.key === "string" ? saved.key : null;
      }
      const receipt = sessionStorage.getItem("gmc-hope-receipt");
      if (receipt && !saved?.aspiration)
        void api<{ leaf: Leaf }>(`/api/leaves/${encodeURIComponent(receipt)}`, {
          cache: "no-store",
        })
          .then((data) => {
            setLeaf(data.leaf);
            try {
              const cached = JSON.parse(
                sessionStorage.getItem("gmc-hope-conversation") || "null",
              );
              if (
                cached?.leafId === data.leaf.id &&
                typeof cached.reply === "string" &&
                cached.reply.length <= 360 &&
                typeof cached.original === "string" &&
                cached.original.length <= 200
              ) {
                setReply(cached.reply);
                setOriginal(cached.original);
                setReplyMode(cached.mode === "openai" ? "openai" : "offline");
              }
            } catch {
              /* Optional private conversation recovery. */
            }
            setStep(2);
          })
          .catch(() => {
            sessionStorage.removeItem("gmc-hope-receipt");
          });
    } catch {
      /* Storage is optional on private browsers. */
    }
    setHydrated(true);
    const changed = () => setOnline(navigator.onLine);
    changed();
    window.addEventListener("online", changed);
    window.addEventListener("offline", changed);
    const checkSettings = () => {
      api<{ settings: { acceptingContributions: boolean } }>(
        "/api/tree/settings",
        { cache: "no-store" },
      )
        .then((data) => setPaused(!data.settings.acceptingContributions))
        .catch(() => {});
    };
    checkSettings();
    const timer = setInterval(checkSettings, 15000);
    return () => {
      clearInterval(timer);
      window.removeEventListener("online", changed);
      window.removeEventListener("offline", changed);
    };
  }, [initialTheme]);
  useEffect(() => {
    if (!hydrated) return;
    try {
      if (leaf) sessionStorage.removeItem("gmc-hope-draft");
      else
        sessionStorage.setItem(
          "gmc-hope-draft",
          JSON.stringify({ theme, aspiration, key: key.current }),
        );
    } catch {
      /* Optional draft recovery. */
    }
  }, [theme, aspiration, leaf, hydrated]);
  useEffect(() => {
    if (hydrated && step === 1)
      window.scrollTo({
        top: 0,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
  }, [step, hydrated]);
  function edit(text: string) {
    setAspiration(text);
    setError("");
    key.current = null;
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true;
    section.current?.querySelector("textarea")?.blur();
    setBusy(true);
    setError("");
    key.current ??= uuid();
    try {
      sessionStorage.setItem(
        "gmc-hope-draft",
        JSON.stringify({ theme, aspiration, key: key.current }),
      );
    } catch {
      /* Optional recovery. */
    }
    try {
      const data = await api<ContributionReceipt>("/api/contributions", {
        method: "POST",
        body: JSON.stringify({
          aspiration,
          theme,
          consent,
          idempotencyKey: key.current,
          visitor_type: visitorType,
        }),
      });
      setLeaf(data.leaf);
      setReply(data.reply);
      setReplyMode(data.reply_mode);
      setOriginal(aspiration);
      try {
        sessionStorage.setItem("gmc-hope-receipt", data.leaf.id);
        sessionStorage.setItem(
          "gmc-hope-conversation",
          JSON.stringify({
            leafId: data.leaf.id,
            reply: data.reply,
            mode: data.reply_mode,
            original: aspiration,
          }),
        );
      } catch {
        /* Optional receipt recovery. */
      }
      setAspiration("");
      setStep(2);
    } catch (err) {
      setError(
        err instanceof Error && err.name === "TimeoutError"
          ? "This is taking longer than expected. Retry to recover your leaf safely."
          : err instanceof TypeError
            ? "We couldn't reach the tree. Your hope is still here. Check your Wi-Fi and try again."
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
      <section className="join-panel">
        <LeafResult
          leaf={leaf}
          compact
          reply={reply}
          replyMode={replyMode}
          original={original}
        />
        <Button
          className="mt-3 w-full"
          variant="ghost"
          size="sm"
          onClick={() => {
            try {
              sessionStorage.removeItem("gmc-hope-receipt");
              sessionStorage.removeItem("gmc-hope-conversation");
            } catch {
              /* Optional storage. */
            }
            key.current = null;
            setLeaf(null);
            setReply("");
            setOriginal("");
            setConsent(false);
            setStep(0);
            setRecovered(false);
          }}
        >
          Grow another hope
          <Sprout size={14} />
        </Button>
      </section>
    );
  return (
    <section ref={section} className="join-panel" aria-label="Add your hope">
      <div className="visit-choice" aria-label="Your visit">
        <span className="text-[11px] text-foreground/55">Your visit</span>
        <div role="group" aria-label="First or returning visitor">
          <button
            type="button"
            aria-pressed={visitorType === "first"}
            disabled={busy}
            onClick={() => {
              setVisitorType("first");
              setShowHistory(false);
            }}
          >
            First visit
          </button>
          <button
            type="button"
            aria-pressed={visitorType === "returning"}
            disabled={busy}
            onClick={() => {
              setVisitorType("returning");
              setShowHistory(true);
            }}
          >
            Returning
          </button>
        </div>
        <Link
          href="/voices"
          className="text-[11px] underline underline-offset-4"
        >
          My voices
        </Link>
      </div>
      {showHistory && (
        <div className="mb-4">
          <VisitorAccess onDismiss={() => setShowHistory(false)} />
        </div>
      )}
      <ol aria-label="Your progress" className="join-progress">
        {["Theme", "Your note", "Your leaf"].map((label, index) => (
          <li key={label} aria-current={step === index ? "step" : undefined}>
            <span>{index + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      {!online && (
        <p role="status" className="join-notice">
          You're offline. Your note is saved in this tab; reconnect to send it.
        </p>
      )}
      {paused && (
        <p role="status" className="join-notice">
          The tree is resting for a moment. Keep your hope here and try again
          shortly.
        </p>
      )}
      {recovered && aspiration && (
        <p className="mb-3 text-[10px] text-foreground/55">
          Your unfinished note is back.
        </p>
      )}
      {step === 0 ? (
        <div className="soft-in">
          <h1 className="text-3xl tracking-tight">What matters to you?</h1>
          <p className="mb-5 mt-2 text-xs text-foreground/55">
            Choose a branch. Your words come next.
          </p>
          <fieldset>
            <legend className="sr-only">Choose a theme</legend>
            <div className="grid grid-cols-2 gap-2.5">
              {themes.map((item) => (
                <label
                  key={item.id}
                  className={`join-theme ${theme === item.id ? "is-selected" : ""}`}
                >
                  <input
                    className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    type="radio"
                    name="theme"
                    checked={theme === item.id}
                    onChange={() => {
                      setTheme(item.id);
                      key.current = null;
                    }}
                  />
                  <ThemeIcon theme={item.id} size={21} />
                  <span className="flex-1 text-xs leading-5 peer-focus-visible:underline">
                    {item.label}
                  </span>
                  {theme === item.id && (
                    <Check size={14} className="shrink-0" />
                  )}
                </label>
              ))}
            </div>
          </fieldset>
          <Button onClick={() => setStep(1)} className="mt-5 w-full">
            Continue
            <ArrowRight size={16} />
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="soft-in space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 rounded-full bg-muted px-3 py-2 text-[10px]">
              <ThemeIcon theme={theme} size={13} />
              {themeFor(theme).short}
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() => setStep(0)}
              className="min-h-9 text-[11px] text-foreground/60"
            >
              Change theme
            </button>
          </div>
          <h1 className="text-2xl">Share a little hope.</h1>
          <label htmlFor="aspiration" className="block text-xs">
            What is your hope for the city?
          </label>
          <textarea
            id="aspiration"
            required
            minLength={3}
            maxLength={200}
            rows={3}
            value={aspiration}
            disabled={busy}
            onChange={(event) => edit(event.target.value)}
            placeholder="A hope, a thought, or something you'd love to see…"
            aria-describedby="aspiration-help"
            className="join-textarea"
          />
          <div
            id="aspiration-help"
            className="flex justify-between gap-3 text-[9px] text-foreground/50"
          >
            <span>Leave out names, contact details and links.</span>
            <span className="shrink-0">{aspiration.length} / 200</span>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => edit(themeFor(theme).prompt)}
            className="inline-flex min-h-8 items-center gap-2 text-[11px] text-foreground/60"
          >
            <Sparkles size={13} />
            Try an example
          </button>
          <label className="flex items-start gap-3 text-[11px] leading-5">
            <input
              type="checkbox"
              required
              checked={consent}
              disabled={busy}
              onChange={(event) => setConsent(event.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 accent-primary"
            />
            <span>
              I agree to share my anonymous leaf publicly and let staff
              privately review my note.
            </span>
          </label>
          <details className="join-privacy">
            <summary>Privacy &amp; how this works</summary>
            <p>
              No account is needed. Only your approved leaf is public; your note
              and personal reply are not shown on the shared tree. When enabled,
              OpenAI interprets your note and checks it before publication.
              Otherwise, a matching offline reply and curated leaf are used.
              Your note and reply are saved privately with encryption for safe
              retries. This tab keeps your unfinished note and reply so a
              refresh can recover them.{" "}
              <Link href="/privacy" className="underline">
                Read the participation policy.
              </Link>
            </p>
          </details>
          {error && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 p-3 text-xs leading-5 text-red-800"
            >
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={
              busy ||
              !consent ||
              aspiration.trim().length < 3 ||
              !online ||
              paused
            }
            className="w-full"
          >
            {busy ? (
              <>
                <LoaderCircle size={16} className="orbit" />
                Finding your branch…
              </>
            ) : (
              <>
                Grow my leaf
                <Sprout size={16} />
              </>
            )}
          </Button>
          {busy && (
            <p
              role="status"
              className="text-center text-[10px] text-foreground/55"
            >
              Reflecting on your note and making room on the tree.
            </p>
          )}
        </form>
      )}
    </section>
  );
}
