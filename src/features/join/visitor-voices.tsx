"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client";
import { VisitorAccess, type VisitHistory } from "./visitor-access";
export function VisitorVoices() {
  const [history, setHistory] = useState<VisitHistory | null>(null),
    [page, setPage] = useState(1),
    [error, setError] = useState("");
  const [busy, setBusy] = useState(false),
    [confirmForget, setConfirmForget] = useState(false);
  const load = useCallback(() => {
    void api<VisitHistory>(`/api/visitor?page=${page}`, { cache: "no-store" })
      .then(setHistory)
      .catch((err) => setError(err.message));
  }, [page]);
  useEffect(load, [load]);
  async function leave(forget = false) {
    setBusy(true);
    setError("");
    try {
      await api(`/api/visitor${forget ? "?forget=true" : ""}`, {
        method: "DELETE",
      });
      try {
        sessionStorage.removeItem("gmc-hope-conversation");
        sessionStorage.removeItem("gmc-hope-receipt");
        sessionStorage.removeItem("gmc-hope-draft");
      } catch {
        /* Storage can be disabled. */
      }
      setHistory(null);
      setPage(1);
      setConfirmForget(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl">Your previous voices</h1>
        <p className="mt-2 text-sm leading-6 text-foreground/60">
          A private place for the hopes you’ve shared and the replies you
          received.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      )}
      {!history ? (
        <p role="status" className="text-xs">
          Opening your visit history…
        </p>
      ) : !history.authenticated ? (
        <VisitorAccess onUnlocked={load} />
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-foreground/60">
              {history.total} saved {history.total === 1 ? "voice" : "voices"}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void leave()}
              disabled={busy}
            >
              Sign out
            </Button>
          </div>
          {!history.voices.length && (
            <p className="rounded-2xl bg-muted p-5 text-sm">
              Your next submitted voice will appear here while you’re signed in.
            </p>
          )}
          {history.voices.map((voice) => (
            <article key={voice.id} className="rounded-3xl bg-card p-5 sm:p-7">
              <p className="text-[11px] text-foreground/55">
                {new Date(voice.created_at).toLocaleDateString("en-GB", {
                  timeZone: "Asia/Thimphu",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}{" "}
                · Chamber {voice.chamber_id}
              </p>
              <h2 className="mt-3 text-xs font-medium">Your note</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                {voice.note || "The original note is no longer available."}
              </p>
              {voice.reply && (
                <div className="mt-4 rounded-2xl bg-muted p-4">
                  <h3 className="text-xs font-medium">Your reply</h3>
                  <p className="mt-2 text-sm leading-6">{voice.reply}</p>
                </div>
              )}
              <p className="mt-4 text-xs leading-5 text-foreground/60">
                Your leaf: “{voice.leaf_message}”
              </p>
              {voice.status === "approved" ? (
                <Link
                  href={`/leaf/${voice.id}`}
                  className="mt-3 inline-flex min-h-9 items-center text-xs underline underline-offset-4"
                >
                  Open public keepsake
                </Link>
              ) : (
                <p className="mt-3 text-xs text-foreground/55">
                  This leaf is no longer on the public tree.
                </p>
              )}
            </article>
          ))}
          {history.pages > 1 && (
            <nav
              className="flex items-center justify-between gap-3"
              aria-label="History pages"
            >
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
              >
                Previous
              </Button>
              <span className="text-xs">
                {page} / {history.pages}
              </span>
              <Button
                variant="secondary"
                disabled={page >= history.pages}
                onClick={() => setPage((value) => value + 1)}
              >
                Next
              </Button>
            </nav>
          )}
          <details className="rounded-2xl bg-muted p-4">
            <summary className="cursor-pointer text-xs">
              Manage my visit profile
            </summary>
            <p className="mt-3 text-xs leading-5 text-foreground/60">
              Removing your profile deletes its CID lookup, PIN and history
              links and signs out every device. Anonymous leaves and staff
              submission records remain. This action cannot be undone.
            </p>
            {confirmForget ? (
              <div className="mt-3 flex flex-wrap gap-3">
                <Button disabled={busy} onClick={() => void leave(true)}>
                  Remove my visit profile
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setConfirmForget(false)}
                >
                  Keep my profile
                </Button>
              </div>
            ) : (
              <Button
                variant="secondary"
                className="mt-3"
                onClick={() => setConfirmForget(true)}
              >
                Remove profile…
              </Button>
            )}
          </details>
        </>
      )}
      <Button asChild className="w-full">
        <Link href="/join">Add a new hope</Link>
      </Button>
    </div>
  );
}
