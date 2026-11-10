"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  LoaderCircle,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Sprout,
  ArrowUpRight,
  Plus,
  Trash2,
  Sparkles,
  Search,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { themes, themeFor, type Leaf, type TreeStats } from "@/lib/catalog";
import { api } from "@/lib/client";
import { Card } from "@/components/ui/card";
type Dashboard = {
  leaves: (Leaf & { status: "approved" | "hidden" })[];
  stats: TreeStats;
  ai: string;
  model: string;
  metrics: Record<string, number>;
  audit: { action: string; leaf_id: string | null; created_at: string }[];
};
export function AdminConsole() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null),
    [configured, setConfigured] = useState(true),
    [password, setPassword] = useState("");
  const [data, setData] = useState<Dashboard | null>(null),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [filter, setFilter] = useState("all"),
    [query, setQuery] = useState(""),
    [confirmClear, setConfirmClear] = useState(false);
  const load = useCallback(async () => {
    const response = await fetch("/api/admin", { cache: "no-store" });
    if (response.status === 401) {
      setAuthenticated(false);
      return;
    }
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    setData(result);
  }, []);
  useEffect(() => {
    let alive = true;
    api<{ authenticated: boolean; configured: boolean }>("/api/admin/session")
      .then((session) => {
        if (alive) {
          setAuthenticated(session.authenticated);
          setConfigured(session.configured);
        }
      })
      .catch(() => {
        if (alive) {
          setAuthenticated(false);
          setError("Could not connect to the local server.");
        }
      });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (!authenticated) return;
    void load().catch((err) => setError(err.message));
    const timer = setInterval(() => {
      void load().catch(() => {});
    }, 10000);
    return () => clearInterval(timer);
  }, [authenticated, load]);
  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy("login");
    setError("");
    try {
      await api("/api/admin/session", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      setAuthenticated(true);
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setBusy("");
    }
  }
  async function action(body: Record<string, string>, label: string) {
    if (busy) return;
    setBusy(label);
    setError("");
    setNotice("");
    try {
      await api("/api/admin", { method: "POST", body: JSON.stringify(body) });
      await load();
      setNotice(
        label === "seed"
          ? "24 illustrative demo leaves are ready (existing demo data is kept)."
          : label === "clear_demo"
            ? "Demo leaves removed. Visitor contributions are kept."
            : "The tree has been updated.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy("");
      setConfirmClear(false);
    }
  }
  async function logout() {
    try {
      await api("/api/admin/session", { method: "DELETE" });
      setAuthenticated(false);
      setData(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-out failed.");
    }
  }
  if (authenticated === null)
    return (
      <main className="flex min-h-screen items-center justify-center">
        <LoaderCircle className="orbit" />
        <span className="sr-only">Loading staff console</span>
      </main>
    );
  if (!authenticated)
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-6 py-12">
        <Brand />
        <div>
          <p className="eyebrow mb-4 text-[#8b7749]">Experience Centre staff</p>
          <h1 className="text-4xl">Care for the canopy.</h1>
          <p className="mt-4 text-sm leading-relaxed text-foreground/60">
            Manage the shared tree, review public leaves and prepare your
            demonstration.
          </p>
        </div>
        <form onSubmit={login} className="space-y-4">
          <label htmlFor="staff-password" className="block text-xs">
            Staff password
          </label>
          <input
            id="staff-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="w-full rounded-lg border border-border bg-white p-3"
          />
          {!configured && (
            <p className="text-xs leading-relaxed">
              Staff access is not configured. Run <code>npm run setup</code> on
              the host laptop and restart the server.
            </p>
          )}
          {error && (
            <p role="alert" className="text-xs text-red-800">
              {error}
            </p>
          )}
          <Button
            disabled={Boolean(busy) || !configured}
            className="w-full"
            type="submit"
          >
            {busy ? (
              <LoaderCircle size={16} className="orbit" />
            ) : (
              <ShieldCheck size={16} />
            )}
            Sign in
          </Button>
        </form>
        <p className="text-[10px] leading-relaxed text-foreground/50">
          The host laptop's .env.local file contains ADMIN_PASSWORD. Your
          session expires after eight hours.
        </p>
        <Link href="/" className="text-xs underline">
          Back to the tree
        </Link>
      </main>
    );
  const visible =
    data?.leaves.filter(
      (leaf) =>
        (filter === "all" ||
          leaf.status === filter ||
          (filter === "demo" && leaf.is_demo)) &&
        (!query ||
          `${leaf.leaf_message} ${themeFor(leaf.category).label}`
            .toLowerCase()
            .includes(query.toLowerCase())),
    ) || [];
  return (
    <>
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-6 py-5">
          <Brand />
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="sm">
              <Link href="/display" target="_blank">
                Open display <ArrowUpRight size={13} />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              aria-label="Sign out"
            >
              <LogOut size={17} />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="eyebrow mb-3 text-[#8b7749]">Staff console</p>
            <h1 className="text-4xl tracking-tight">
              A little care helps it grow.
            </h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void load().catch((err) => setError(err.message))}
          >
            <RefreshCw size={13} />
            Refresh
          </Button>
        </div>
        {error && (
          <p
            role="alert"
            className="mb-5 rounded-lg bg-red-50 p-4 text-sm text-red-800"
          >
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="mb-5 rounded-lg bg-[#e5edde] p-4 text-sm">
            {notice}
          </p>
        )}
        <div className="mb-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            ["Public hopes", data?.stats.total ?? "-"],
            ["Added today", data?.stats.today ?? "-"],
            ["Demo leaves", data?.stats.demo ?? "-"],
            [
              "AI connection",
              data?.ai === "openai" ? "OpenAI" : "Offline fallback",
            ],
          ].map(([label, value]) => (
            <Card key={label} className="p-5">
              <p className="text-[10px] uppercase tracking-wider text-foreground/50">
                {label}
              </p>
              <p className="serif mt-4 text-3xl">{value}</p>
              {label === "AI connection" && (
                <p className="mt-2 text-[10px] text-foreground/50">
                  {data?.ai === "openai"
                    ? data.model
                    : "Set OPENAI_API_KEY to enable AI"}
                </p>
              )}
            </Card>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <section className="min-w-0">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex gap-1 rounded-lg bg-muted p-1">
                {["all", "approved", "hidden", "demo"].map((item) => (
                  <button
                    key={item}
                    onClick={() => setFilter(item)}
                    className={`min-h-10 rounded-md px-3 text-xs capitalize ${filter === item ? "bg-white shadow-sm" : "text-foreground/60"}`}
                  >
                    {item === "approved" ? "Public" : item}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-white/40 px-3">
                <Search size={14} />
                <input
                  aria-label="Search leaves"
                  placeholder="Find a hope…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="min-h-11 w-40 bg-transparent text-xs outline-none"
                />
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted text-[9px] uppercase tracking-wide text-foreground/60">
                  <tr>
                    <th className="p-4 font-normal">The hope</th>
                    <th className="hidden p-4 font-normal sm:table-cell">
                      Status
                    </th>
                    <th className="p-4 text-right font-normal">Care</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((leaf) => (
                    <tr
                      key={leaf.id}
                      className="border-t border-border bg-white/30"
                    >
                      <td className="p-4">
                        <p className="max-w-lg text-sm leading-relaxed">
                          {leaf.leaf_message}
                        </p>
                        <p className="mt-2 text-[9px] text-foreground/55">
                          <span
                            className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full"
                            style={{
                              background: themeFor(leaf.category).color,
                            }}
                          />
                          {themeFor(leaf.category).short} ·{" "}
                          {leaf.is_demo ? "DEMO · " : ""}
                          {leaf.mode === "openai" ? "AI" : "Curated"} ·{" "}
                          {new Date(leaf.created_at).toLocaleTimeString(
                            "en-GB",
                            {
                              timeZone: "Asia/Thimphu",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </p>
                      </td>
                      <td className="hidden p-4 sm:table-cell">
                        <span
                          className={`rounded-full px-2 py-1 text-[9px] ${leaf.status === "approved" ? "bg-[#e4ebdc]" : "bg-[#eae5dc]"}`}
                        >
                          {leaf.status === "approved" ? "Public" : "Hidden"}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={Boolean(busy)}
                          aria-label={
                            leaf.status === "approved"
                              ? "Hide leaf"
                              : "Restore leaf"
                          }
                          onClick={() =>
                            action(
                              {
                                action: "status",
                                id: leaf.id,
                                status:
                                  leaf.status === "approved"
                                    ? "hidden"
                                    : "approved",
                              },
                              leaf.id,
                            )
                          }
                        >
                          {busy === leaf.id ? (
                            <LoaderCircle size={16} className="orbit" />
                          ) : leaf.status === "approved" ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!visible.length && (
                <div className="p-10 text-center">
                  <Sprout size={28} strokeWidth={1} className="mx-auto mb-3" />
                  <p className="text-sm">
                    {data ? "No leaves here yet." : "Loading the canopy…"}
                  </p>
                </div>
              )}
            </div>
            <p className="mt-3 text-[10px] text-foreground/45">
              Showing up to 500 recent leaves. Hidden leaves disappear from
              public pages and connected displays.
            </p>
          </section>
          <aside className="space-y-5">
            <Card className="space-y-4">
              <h2 className="text-2xl">Prepare the demo</h2>
              <p className="text-xs leading-relaxed text-foreground/60">
                Load a varied canopy for rehearsal. Every sample is visibly
                labelled.
              </p>
              <Button
                variant="outline"
                size="sm"
                disabled={Boolean(busy)}
                className="w-full"
                onClick={() => action({ action: "seed" }, "seed")}
              >
                <Plus size={14} />
                Load 24 demo leaves
              </Button>
              {confirmClear ? (
                <div className="space-y-3 rounded-lg border border-border p-3">
                  <p className="text-xs">
                    Remove all demo leaves? Visitor hopes will stay.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        action({ action: "clear_demo" }, "clear_demo")
                      }
                      disabled={Boolean(busy)}
                    >
                      Remove demos
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmClear(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={Boolean(busy) || !data?.stats.demo}
                  className="w-full"
                  onClick={() => setConfirmClear(true)}
                >
                  <Trash2 size={14} />
                  Clear demo leaves
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={Boolean(busy)}
                className="w-full"
                onClick={() => action({ action: "reflect" }, "reflect")}
              >
                <Sparkles size={14} />
                Update collective reflection
              </Button>
            </Card>
            <Card>
              <h2 className="mb-5 text-2xl">Branches of hope</h2>
              <div className="space-y-4">
                {themes.map((theme) => (
                  <div key={theme.id}>
                    <div className="mb-1.5 flex justify-between text-[10px]">
                      <span>{theme.short}</span>
                      <span>{data?.stats.categories[theme.id] ?? 0}</span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          background: theme.color,
                          width: `${Math.max(0, ((data?.stats.categories[theme.id] || 0) / Math.max(data?.stats.total || 1, 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <h2 className="mb-4 text-2xl">Service activity</h2>
              <dl className="space-y-3 text-xs">
                {[
                  ["Accepted", data?.metrics.accepted || 0],
                  ["Rejected", data?.metrics.rejected || 0],
                  ["AI interpretations", data?.metrics.ai_success || 0],
                  ["AI fallbacks", data?.metrics.ai_fallback || 0],
                ].map(([label, count]) => (
                  <div key={label} className="flex justify-between">
                    <dt className="text-foreground/55">{label}</dt>
                    <dd>{count}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </aside>
        </div>
      </main>
    </>
  );
}
