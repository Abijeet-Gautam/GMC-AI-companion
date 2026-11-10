"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import {
  Maximize,
  Minimize,
  ArrowUpRight,
  Sprout,
  Quote,
  X,
} from "lucide-react";
import { TreeCanvas } from "./tree-canvas";
import { themes, themeFor, type Leaf } from "@/lib/catalog";
import { useTree } from "@/hooks/use-tree";
import { appUrl } from "@/lib/client";
export function DisplayScreen() {
  const { tree, connection } = useTree({ cache: true });
  const [leaves, setLeaves] = useState<Leaf[]>([]),
    [featured, setFeatured] = useState<Leaf | null>(null),
    [selected, setSelected] = useState<Leaf | null>(null);
  const [joinUrl, setJoinUrl] = useState(""),
    [full, setFull] = useState(false),
    [pending, setPending] = useState(0),
    [lastArrival, setLastArrival] = useState(0),
    [showReflection, setShowReflection] = useState(false);
  const initialized = useRef(false),
    seen = useRef(new Set<string>()),
    queue = useRef<Leaf[]>([]),
    available = useRef(new Set<string>());
  useEffect(() => {
    setJoinUrl(appUrl() + "/join");
    const changed = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, []);
  useEffect(() => {
    if (!tree) return;
    available.current = new Set(tree.leaves.map((leaf) => leaf.id));
    if (!initialized.current) {
      initialized.current = true;
      tree.leaves.forEach((leaf) => seen.current.add(leaf.id));
      setLeaves(tree.leaves);
      setFeatured(tree.leaves[0] || null);
      return;
    }
    // Removed leaves can later be restored by staff. Forget their seen IDs so
    // that restoration becomes an arrival again, without requiring a reload.
    for (const id of seen.current) {
      if (!available.current.has(id)) seen.current.delete(id);
    }
    const incoming = tree.leaves
      .filter((leaf) => !seen.current.has(leaf.id))
      .reverse();
    incoming.forEach((leaf) => seen.current.add(leaf.id));
    queue.current = [
      ...queue.current.filter((leaf) => available.current.has(leaf.id)),
      ...incoming,
    ].slice(-120);
    setPending(queue.current.length);
    setLeaves((previous) =>
      previous.filter((leaf) => available.current.has(leaf.id)),
    );
    setSelected((previous) =>
      previous && !available.current.has(previous.id) ? null : previous,
    );
    setFeatured((previous) =>
      previous && !available.current.has(previous.id) ? null : previous,
    );
  }, [tree]);
  useEffect(() => {
    const interval = setInterval(() => {
      const leaf = queue.current.shift();
      if (!leaf) return;
      setPending(queue.current.length);
      if (!available.current.has(leaf.id)) return;
      setLeaves((previous) =>
        [leaf, ...previous.filter((item) => item.id !== leaf.id)].slice(0, 120),
      );
      setFeatured(leaf);
      setLastArrival(Date.now());
      setShowReflection(false);
    }, 1400);
    const reflectionTimer = setInterval(
      () => setShowReflection((value) => !value),
      18000,
    );
    return () => {
      clearInterval(interval);
      clearInterval(reflectionTimer);
    };
  }, []);
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      /* Some embedded browsers do not support fullscreen. */
    }
  }
  const active = selected || featured,
    reflection =
      showReflection &&
      tree?.reflection &&
      !selected &&
      Date.now() - lastArrival > 6500;
  return (
    <div className="forest grain min-h-screen">
      <main className="display-screen px-5 py-7 sm:px-10 sm:py-9">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs tracking-wider"
          >
            <Sprout size={22} strokeWidth={1.3} />
            <span>
              GMC{" "}
              <span className="font-normal text-white/50">
                EXPERIENCE CENTRE
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="eyebrow flex items-center gap-2 text-[9px] text-white/60">
              <span
                className={`h-1.5 w-1.5 rounded-full ${connection === "live" ? "bg-[#b9d9a6]" : "bg-amber-300"}`}
              />
              {connection === "live"
                ? "A living collection"
                : connection === "connecting"
                  ? "Connecting"
                  : "Reconnecting"}
            </span>
            <button
              onClick={toggleFullscreen}
              className="no-print flex h-11 w-11 items-center justify-center text-white/60 hover:text-white"
              aria-label={full ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {full ? <Minimize size={17} /> : <Maximize size={17} />}
            </button>
          </div>
        </header>
        <div className="display-layout">
          <section className="relative pt-10 text-center">
            <p className="eyebrow mb-4 text-[#d5bf85]">
              The Living Tree of GMC
            </p>
            <h1 className="mx-auto max-w-lg text-4xl leading-tight tracking-tight sm:text-5xl">
              The future grows
              <br />
              with <em className="text-[#d5bf85]">every voice.</em>
            </h1>
            <p className="mt-4 text-xs text-white/55">
              A shared canopy of hopes. What will you add?
            </p>
            <TreeCanvas
              leaves={leaves}
              activeId={active?.id}
              arrivalId={lastArrival ? featured?.id : undefined}
              onSelect={setSelected}
              className="display-tree mx-auto -mb-9 -mt-1"
            />
            <div className="mx-auto mb-8 flex max-w-lg flex-wrap justify-center gap-x-5 gap-y-2">
              {themes.map((theme) => (
                <span
                  key={theme.id}
                  className="flex items-center gap-1.5 text-[9px] tracking-wide text-white/65"
                >
                  <span
                    className="h-1 w-1 rounded-full"
                    style={{ background: theme.color }}
                  />
                  {theme.short}
                </span>
              ))}
            </div>
          </section>
          <aside className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 pb-3">
            <div
              className="relative flex min-h-36 w-full flex-col justify-center rounded-xl border border-white/10 bg-white/[.025] px-6 py-5 text-center"
              aria-live="polite"
            >
              {selected && (
                <button
                  onClick={() => setSelected(null)}
                  className="absolute right-2 top-2 p-3 text-white/50"
                  aria-label="Close selected leaf"
                >
                  <X size={14} />
                </button>
              )}
              {reflection ? (
                <div className="soft-in">
                  <Quote size={18} className="mx-auto mb-3 text-[#d5bf85]" />
                  <p className="eyebrow mb-3 text-[8px] text-white/45">
                    A reflection from our branches
                  </p>
                  <p className="serif text-xl leading-relaxed text-[#e4d8b2]">
                    {tree.reflection!.body}
                  </p>
                </div>
              ) : active ? (
                <div className="arrival" key={active.id}>
                  <p
                    className="eyebrow mb-4 text-[8px]"
                    style={{ color: themeFor(active.category).color }}
                  >
                    {active.is_demo
                      ? "Illustrative demo leaf"
                      : selected
                        ? themeFor(active.category).label
                        : "A hope taking root"}
                  </p>
                  <blockquote className="serif text-2xl leading-relaxed text-[#f3ead3]">
                    &ldquo;{active.leaf_message}&rdquo;
                  </blockquote>
                  <p className="mt-4 text-[9px] text-white/40">
                    {themeFor(active.category).label}
                  </p>
                </div>
              ) : (
                <div>
                  <Sprout className="mx-auto mb-3 text-[#d5bf85]" size={22} />
                  <p className="serif text-2xl">
                    Every future begins with a hope.
                  </p>
                  <p className="mt-3 text-xs text-white/50">
                    Scan below to grow the first leaf.
                  </p>
                </div>
              )}
            </div>
            <section className="flex w-full items-center gap-5 rounded-xl bg-[#f7f4e8] p-5 text-[#163e32]">
              {joinUrl && (
                <div className="shrink-0 rounded-lg bg-white p-2">
                  <QRCodeSVG
                    value={joinUrl}
                    size={96}
                    marginSize={3}
                    title="Scan to add your hope"
                  />
                </div>
              )}
              <div className="min-w-0">
                <h2 className="text-2xl">Grow your leaf.</h2>
                <p className="mb-3 mt-2 text-[11px] leading-relaxed text-[#163e32]/65">
                  One hope. One leaf.
                  <br />
                  One shared future.
                </p>
                <p className="break-all text-[9px] text-[#163e32]/70">
                  {joinUrl.replace(/^https?:\/\//, "")}
                </p>
              </div>
            </section>
            <div className="flex w-full items-center justify-between px-3">
              <div>
                <span className="serif text-4xl text-[#d5bf85]">
                  {tree?.total ?? 0}
                </span>
                <span className="ml-3 text-xs text-white/55">
                  hopes taking root
                </span>
              </div>
              <Link
                href="/join"
                className="flex items-center gap-1 text-[10px] text-white/60"
              >
                Add yours <ArrowUpRight size={13} />
              </Link>
            </div>
            <p
              role="status"
              className="text-center text-[10px] leading-relaxed text-white/45"
            >
              {connection === "reconnecting"
                ? "Connection paused. The last tree stays here while we reconnect."
                : pending
                  ? `${pending} ${pending === 1 ? "leaf is" : "leaves are"} finding a branch…`
                  : "Anonymous voices. Shared possibilities."}
              {Boolean(tree?.stats.demo) && (
                <span className="mt-1 block">
                  Includes {tree!.stats.demo} illustrative demo leaves.
                </span>
              )}
            </p>
          </aside>
        </div>
        <footer className="mt-4 flex flex-wrap justify-between gap-3 border-t border-white/10 pt-5 text-[9px] tracking-wide text-white/40">
          <span>Rooted in values. Growing through people.</span>
          <span>Approved hopes are public and anonymous.</span>
        </footer>
      </main>
    </div>
  );
}
