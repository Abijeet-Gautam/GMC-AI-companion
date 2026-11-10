import Link from "next/link";
import { Sprout, ArrowUpRight } from "lucide-react";
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="The Living Tree home"
      className="inline-flex items-center gap-3"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-current/20">
        <Sprout size={22} strokeWidth={1.3} />
      </span>
      <span>
        <span className="block serif text-xl leading-none">
          The Living Tree
        </span>
        {!compact && (
          <span className="mt-1 block text-[8px] uppercase tracking-[.26em] opacity-65">
            Gelephu Mindfulness City
          </span>
        )}
      </span>
    </Link>
  );
}
export function SiteHeader() {
  return (
    <header className="mx-auto flex max-w-7xl items-center justify-between gap-5 border-b border-border px-5 py-5 md:px-10">
      <Brand />
      <nav
        aria-label="Main navigation"
        className="flex items-center gap-5 text-xs"
      >
        <Link href="/chambers" className="hidden sm:inline">
          The four chambers
        </Link>
        <Link href="/display" className="flex items-center gap-1">
          Live tree <ArrowUpRight size={14} />
        </Link>
      </nav>
    </header>
  );
}
export function SiteFooter() {
  return (
    <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 border-t border-border px-6 py-7 text-[10px] text-foreground/60">
      <span>Rooted in values. Growing through people.</span>
      <div className="flex flex-wrap gap-x-5 gap-y-3">
        <Link href="/privacy">Participation & privacy</Link>
        <Link href="/admin">Staff console</Link>
        <span>GMC Experience Centre · Hackathon</span>
      </div>
    </footer>
  );
}
