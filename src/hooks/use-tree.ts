"use client";
import { useEffect, useState } from "react";
import type { TreeSnapshot } from "@/lib/catalog";
export function useTree({ cache = false }: { cache?: boolean } = {}) {
  const [tree, setTree] = useState<TreeSnapshot | null>(null),
    [connection, setConnection] = useState<
      "connecting" | "live" | "reconnecting"
    >("connecting");
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    let busy = false;
    function accept(data: TreeSnapshot) {
      if (!alive) return;
      setTree((previous) =>
        !previous ||
        Date.parse(data.serverTime) >= Date.parse(previous.serverTime)
          ? data
          : previous,
      );
      setConnection(navigator.onLine ? "live" : "reconnecting");
      if (cache)
        try {
          localStorage.setItem("gmc-tree-cache", JSON.stringify(data));
        } catch {
          /* optional cache */
        }
    }
    if (cache)
      try {
        const stored = JSON.parse(
          localStorage.getItem("gmc-tree-cache") || "null",
        );
        if (
          stored &&
          Array.isArray(stored.leaves) &&
          Date.now() - Date.parse(stored.serverTime) < 86400000
        )
          setTree(stored);
      } catch {
        /* optional cache */
      }
    async function reconcile() {
      if (busy) return;
      busy = true;
      try {
        const response = await fetch("/api/leaves", {
          cache: "no-store",
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(10000),
          ]),
        });
        if (!response.ok) throw new Error();
        accept(await response.json());
      } catch {
        if (alive) setConnection("reconnecting");
      } finally {
        busy = false;
      }
    }
    const stream = new EventSource("/api/tree/stream");
    stream.addEventListener("tree", (event) => {
      try {
        accept(JSON.parse((event as MessageEvent).data));
      } catch {
        void reconcile();
      }
    });
    stream.onerror = () => {
      if (alive) setConnection("reconnecting");
    };
    void reconcile();
    const interval = setInterval(reconcile, 15000);
    window.addEventListener("online", reconcile);
    const offline = () => setConnection("reconnecting");
    window.addEventListener("offline", offline);
    return () => {
      alive = false;
      controller.abort();
      stream.close();
      clearInterval(interval);
      window.removeEventListener("online", reconcile);
      window.removeEventListener("offline", offline);
    };
  }, [cache]);
  return { tree, connection };
}
