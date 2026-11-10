"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import {
  Maximize,
  Minimize,
  ArrowUpRight,
  Sprout,
  X,
  Wind,
  Play,
  Pause,
  Plus,
  Minus,
  RotateCcw,
  Leaf as LeafIcon,
} from "lucide-react";
import { TreeCanvas } from "./tree-canvas";
import { themes, themeFor, type Leaf } from "@/lib/catalog";
import { useTree } from "@/hooks/use-tree";
import { appUrl } from "@/lib/client";
import { defaultTreeSettings, treePalettes } from "@/lib/tree-settings";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import type { SceneController } from "./tree-scene";
export function DisplayScreen() {
  const { tree, connection } = useTree({ cache: true });
  const scene = useRef<SceneController | null>(null);
  const [rotating, setRotating] = useState(true);
  const settings = tree?.settings || defaultTreeSettings;
  const presentation = useMemo(
    () => ({ ...settings, autoRotate: rotating }),
    [settings, rotating],
  );
  const [leaves, setLeaves] = useState<Leaf[]>([]),
    [featured, setFeatured] = useState<Leaf | null>(null),
    [selected, setSelected] = useState<Leaf | null>(null);
  const [joinUrl, setJoinUrl] = useState(""),
    [full, setFull] = useState(false),
    [pending, setPending] = useState(0),
    [lastArrival, setLastArrival] = useState(0),
    [showReflection, setShowReflection] = useState(false);
  const initialized = useRef(false),
    synced = useRef(false),
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
    if (!initialized.current || (!synced.current && connection === "live")) {
      initialized.current = true;
      if (connection === "live") synced.current = true;
      seen.current.clear();
      queue.current = [];
      setPending(0);
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
  }, [tree, connection]);
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
  const palette = treePalettes[settings.palette];
  const contentKey = reflection
    ? `reflection-${tree?.reflection?.body}`
    : active?.id || "first-hope";
  return (
    <MotionConfig reducedMotion="user">
      <div
        className="kiosk-shell"
        data-testid="kiosk-display"
        data-palette={settings.palette}
        style={{
          background: palette.background,
          color:
            settings.palette === "night"
              ? "#f5f8ee"
              : settings.palette === "frost"
                ? "#071d2e"
                : "#243c3a",
        }}
      >
        <TreeCanvas
          leaves={leaves}
          contributionCount={Math.max(0, (tree?.total || 0) - pending)}
          settings={presentation}
          activeId={active?.id}
          arrivalId={lastArrival ? featured?.id : undefined}
          onSelect={setSelected}
          className="kiosk-tree"
          environment="garden"
          sceneRef={scene}
          showControls={false}
        />
        <main className="kiosk-screen">
          <motion.header
            className="kiosk-header"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <Link href="/" className="kiosk-brand">
              <Sprout strokeWidth={1.5} />
              <span>
                The living tree
                <span className="kiosk-brand-subtitle">
                  Gelephu Mindfulness City
                </span>
              </span>
            </Link>
            <div className="kiosk-header-actions">
              <span className="kiosk-connection">
                <span
                  className={
                    connection === "live" ? "bg-[#55834d]" : "bg-amber-500"
                  }
                />
                {connection === "live"
                  ? "A living collection"
                  : connection === "connecting"
                    ? "Connecting"
                    : "Reconnecting"}
              </span>
              <Link
                href="/tree"
                className="kiosk-studio-link"
                aria-label="Open interactive Tree Studio"
              >
                Customize tree
                <ArrowUpRight size={13} />
              </Link>
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={toggleFullscreen}
                className="kiosk-fullscreen"
                aria-label={full ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {full ? <Minimize size={18} /> : <Maximize size={18} />}
              </motion.button>
            </div>
          </motion.header>
          <motion.div
            className="kiosk-heading"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.15 }}
          >
            <h1>{settings.headline}</h1>
            <span>
              Every leaf is someone's hope. Find a story in the branches.
            </span>
          </motion.div>
          <section
            className="kiosk-feature"
            aria-label="A hope from the tree"
            aria-live="polite"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={contentKey}
                initial={{ opacity: 0, y: 22, filter: "blur(5px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{
                  opacity: 0,
                  y: -12,
                  filter: "blur(3px)",
                  transition: { duration: 0.18 },
                }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              >
                {selected && (
                  <motion.button
                    whileHover={{ rotate: 90 }}
                    onClick={() => setSelected(null)}
                    className="kiosk-close"
                    aria-label="Close selected leaf"
                  >
                    <X size={17} />
                  </motion.button>
                )}
                <span
                  className="kiosk-leaf-emblem"
                  style={{
                    color: active
                      ? themeFor(active.category).color
                      : palette.leaves[0],
                  }}
                >
                  <LeafIcon size={26} strokeWidth={1.2} />
                </span>
                <p className="kiosk-feature-label">
                  {reflection
                    ? "A reflection from our branches"
                    : active?.is_demo
                      ? "Illustrative demo leaf"
                      : selected
                        ? themeFor(selected.category).label
                        : active
                          ? "A hope taking root"
                          : "A little possibility"}
                </p>
                <blockquote>
                  {reflection
                    ? tree!.reflection!.body
                    : active
                      ? `“${active.leaf_message}”`
                      : "Every future begins with a hope."}
                </blockquote>
                <p className="kiosk-leaf-code">
                  {active && !reflection
                    ? `Leaf #${active.id.slice(0, 6)} · ${themeFor(active.category).short}`
                    : "Scan to grow a new leaf."}
                </p>
              </motion.div>
            </AnimatePresence>
          </section>
          <motion.section
            className="kiosk-qr-panel"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            {joinUrl && (
              <Link
                href="/join"
                className="kiosk-qr"
                aria-label="Add your hope"
              >
                {" "}
                <QRCodeSVG
                  value={joinUrl}
                  size={160}
                  marginSize={4}
                  title="Scan to add your hope"
                />
              </Link>
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
          </motion.section>
          <div className="kiosk-legend" aria-label="Explore hopes by theme">
            {themes.map((theme) => (
              <motion.button
                key={theme.id}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.95 }}
                disabled={!leaves.some((leaf) => leaf.category === theme.id)}
                onClick={() =>
                  setSelected(
                    leaves.find((leaf) => leaf.category === theme.id) || null,
                  )
                }
                aria-label={`Read a ${theme.short.toLowerCase()} hope`}
              >
                <i style={{ background: theme.color }} />
                {theme.short}
              </motion.button>
            ))}
          </div>
          <div className="kiosk-controls" aria-label="Tree controls">
            <span>Drag to explore · Scroll to zoom</span>
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.9 }}
              aria-label="Send a breeze through the tree"
              onClick={() => scene.current?.breeze()}
            >
              <Wind size={18} />
            </motion.button>
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.9 }}
              aria-label={
                rotating ? "Pause tree rotation" : "Resume tree rotation"
              }
              aria-pressed={!rotating}
              onClick={() => setRotating((value) => !value)}
            >
              {rotating ? <Pause size={17} /> : <Play size={17} />}
            </motion.button>
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.9 }}
              aria-label="Zoom in on tree"
              onClick={() => scene.current?.zoom(0.85)}
            >
              <Plus size={19} />
            </motion.button>
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.9 }}
              aria-label="Zoom out of tree"
              onClick={() => scene.current?.zoom(1.15)}
            >
              <Minus size={19} />
            </motion.button>
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.9 }}
              aria-label="Reset tree view"
              onClick={() => scene.current?.resetView()}
            >
              <RotateCcw size={17} />
            </motion.button>
          </div>
          <footer className="kiosk-footer">
            <span className="kiosk-count">
              <strong>{tree?.total ?? 0}</strong>
              {tree?.total === 1 ? "hope" : "hopes"} taking root
            </span>
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
          </footer>
        </main>
      </div>
    </MotionConfig>
  );
}
