"use client";
import { useEffect, useRef, useState } from "react";
import { TreeIllustration } from "./tree-illustration";
import { defaultTreeSettings, type TreeSettings } from "@/lib/tree-settings";
import { themeFor, type Leaf } from "@/lib/catalog";
import type { SceneController, ProjectedLeaf } from "./tree-scene";

export function TreeCanvas({
  leaves = [],
  activeId,
  arrivalId,
  onSelect,
  illustrative = false,
  className = "",
  settings = defaultTreeSettings,
}: {
  leaves?: Leaf[];
  activeId?: string;
  arrivalId?: string;
  onSelect?: (leaf: Leaf) => void;
  illustrative?: boolean;
  className?: string;
  settings?: TreeSettings;
}) {
  const host = useRef<HTMLDivElement>(null),
    controller = useRef<SceneController | null>(null);
  const markerElements = useRef(new Map<string, HTMLButtonElement>());
  const latest = useRef({ leaves, activeId, arrivalId });
  latest.current = { leaves, activeId, arrivalId };
  const [state, setState] = useState<"loading" | "3d" | "illustration">(
    "loading",
  );
  // Only appearance changes rebuild geometry. Incoming contributions update sprites.
  const appearance = JSON.stringify(settings);
  useEffect(() => {
    let cancelled = false,
      scene: SceneController | null = null;
    setState("loading");
    if (settings.renderer === "illustration") {
      setState("illustration");
      return;
    }
    const project = (items: ProjectedLeaf[]) => {
      for (const item of items) {
        const button = markerElements.current.get(item.id);
        if (!button) continue;
        button.style.transform = `translate(${item.x}px,${item.y}px) translate(-50%,-50%)`;
        button.style.visibility = item.visible ? "visible" : "hidden";
      }
    };
    void import("./tree-scene")
      .then(({ createTreeScene }) => {
        if (cancelled || !host.current) return;
        try {
          scene = createTreeScene(host.current, settings, project, () => {
            scene?.dispose();
            controller.current = null;
            if (!cancelled) setState("illustration");
          });
          controller.current = scene;
          scene.update(
            latest.current.leaves,
            latest.current.activeId,
            latest.current.arrivalId,
          );
          setState("3d");
        } catch {
          setState("illustration");
        }
      })
      .catch(() => {
        if (!cancelled) setState("illustration");
      });
    return () => {
      cancelled = true;
      scene?.dispose();
      controller.current = null;
    };
    // appearance is a stable value representation of every setting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appearance]);
  useEffect(() => {
    controller.current?.update(leaves, activeId, arrivalId);
  }, [leaves, activeId, arrivalId, state]);
  return (
    <div
      className={`procedural-tree ${className}`}
      data-renderer={state}
      data-species={settings.species}
      role="group"
      aria-label="The Living Tree of GMC"
    >
      <div ref={host} className="procedural-host" />
      {state !== "3d" && (
        <div className="tree-fallback">
          <TreeIllustration
            leaves={leaves}
            activeId={activeId}
            arrivalId={arrivalId}
            onSelect={onSelect}
            illustrative={illustrative}
          />
        </div>
      )}
      {state === "3d" && onSelect && (
        <div className="tree-marker-layer">
          {leaves.map((leaf) => (
            <button
              key={leaf.id}
              type="button"
              className={`tree-leaf tree-marker ${activeId === leaf.id ? "is-featured" : ""}`}
              ref={(element) => {
                if (element) markerElements.current.set(leaf.id, element);
                else markerElements.current.delete(leaf.id);
              }}
              aria-label={`${themeFor(leaf.category).short}: ${leaf.leaf_message}`}
              onClick={() => onSelect(leaf)}
              style={
                {
                  "--leaf-color": themeFor(leaf.category).color,
                } as React.CSSProperties
              }
            >
              <span className="sr-only">{leaf.leaf_message}</span>
            </button>
          ))}
        </div>
      )}
      {state === "illustration" && (
        <span className="renderer-note">Illustrated display</span>
      )}
    </div>
  );
}
