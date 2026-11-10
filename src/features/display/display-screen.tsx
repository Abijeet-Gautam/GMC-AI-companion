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
import { defaultTreeSettings } from "@/lib/tree-settings";
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
  const settings = tree?.settings || defaultTreeSettings;
  return (
    <div className="forest grain kiosk-shell" data-testid="kiosk-display">
      <main className="kiosk-screen">
        <header className="kiosk-header">
          <Link href="/" className="kiosk-brand">
            <Sprout strokeWidth={1.3} />
            <span>
              GMC <span className="opacity-50">EXPERIENCE CENTRE</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="kiosk-connection">
              <span
                className={
                  connection === "live" ? "bg-[#b9d9a6]" : "bg-amber-300"
                }
              />
              {connection === "live"
                ? "A living collection"
                : connection === "connecting"
                  ? "Connecting"
                  : "Reconnecting"}
            </span>
            <button
              onClick={toggleFullscreen}
              className="kiosk-fullscreen"
              aria-label={full ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {full ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </header>
        <div className="kiosk-layout">
          <section className="kiosk-visual">
            <div className="kiosk-heading">
              <p>The Living Tree of GMC</p>
              <h1>{settings.headline}</h1>
              <span>A shared canopy of hopes. What will you add?</span>
            </div>
            <TreeCanvas
              leaves={leaves}
              settings={settings}
              activeId={active?.id}
              arrivalId={lastArrival ? featured?.id : undefined}
              onSelect={setSelected}
              className="kiosk-tree"
            />
            <div className="kiosk-legend">
              {themes.map((theme) => (
                <span key={theme.id}>
                  <i style={{ background: theme.color }} />
                  {theme.short}
                </span>
              ))}
            </div>
          </section>
          <aside className="kiosk-aside">
            <div className="kiosk-feature" aria-live="polite">
              {selected && (
                <button
                  onClick={() => setSelected(null)}
                  className="kiosk-close"
                  aria-label="Close selected leaf"
                >
                  <X size={16} />
                </button>
              )}
              {reflection ? (
                <div className="soft-in">
                  <Quote size={22} className="mx-auto mb-3 text-[#d5bf85]" />
                  <p className="kiosk-feature-label">
                    A reflection from our branches
                  </p>
                  <blockquote>{tree!.reflection!.body}</blockquote>
                </div>
              ) : active ? (
                <div className="arrival" key={active.id}>
                  <p
                    className="kiosk-feature-label"
                    style={{ color: themeFor(active.category).color }}
                  >
                    {active.is_demo
                      ? "Illustrative demo leaf"
                      : selected
                        ? themeFor(active.category).label
                        : "A hope taking root"}
                  </p>
                  <blockquote>&ldquo;{active.leaf_message}&rdquo;</blockquote>
                  <p className="kiosk-leaf-code">
                    Leaf #{active.id.slice(0, 6).toUpperCase()} ·{" "}
                    {themeFor(active.category).short}
                  </p>
                </div>
              ) : (
                <div>
                  <Sprout className="mx-auto mb-3 text-[#d5bf85]" size={27} />
                  <blockquote>Every future begins with a hope.</blockquote>
                  <p className="kiosk-leaf-code">
                    Scan to grow the first leaf.
                  </p>
                </div>
              )}
            </div>
            <section className="kiosk-qr-panel">
              {joinUrl && (
                <div className="kiosk-qr">
                  <QRCodeSVG
                    value={joinUrl}
                    size={160}
                    marginSize={4}
                    title="Scan to add your hope"
                  />
                </div>
              )}
              <div className="kiosk-qr-copy">
                <h2>
                  {settings.acceptingContributions
                    ? "Grow your leaf."
                    : "A moment to reflect."}
                </h2>
                <p>
                  {settings.acceptingContributions
                    ? "Scan. Share a hope. Watch it grow."
                    : "The tree is resting. Come back shortly."}
                </p>
                <span>{joinUrl.replace(/^https?:\/\//, "")}</span>
              </div>
            </section>
            <div className="kiosk-count">
              <span>
                <strong>{tree?.total ?? 0}</strong> hopes taking root
              </span>
              <Link href="/join">
                Add yours <ArrowUpRight size={15} />
              </Link>
            </div>
            <p role="status" className="kiosk-status">
              {connection === "reconnecting"
                ? "Connection paused. Keeping the tree while we reconnect."
                : pending
                  ? `${pending} ${pending === 1 ? "leaf is" : "leaves are"} finding a branch…`
                  : "Anonymous voices. Shared possibilities."}
              {Boolean(tree?.stats.demo) && (
                <span>
                  Includes {tree!.stats.demo} illustrative demo leaves.
                </span>
              )}
            </p>
          </aside>
        </div>
        <footer className="kiosk-footer">
          <span>Rooted in values. Growing through people.</span>
          <span>Approved hopes are public and anonymous.</span>
        </footer>
      </main>
    </div>
  );
}
