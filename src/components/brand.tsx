"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sprout, ArrowUpRight } from "lucide-react";
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="GM Tree home"
      className="inline-flex items-center gap-2 sm:gap-3"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-accent sm:h-10 sm:w-10">
        <Sprout size={22} strokeWidth={1.6} />
      </span>
      <span>
        <span className="block whitespace-nowrap text-[15px] font-semibold leading-none tracking-tight sm:text-xl">
          GM Tree
        </span>
        {!compact && (
          <span className="mt-1.5 block whitespace-nowrap text-[6px] tracking-[.18em] opacity-55 sm:text-[8px]">
            Gelephu Mindfulness Tree
          </span>
        )}
      </span>
    </Link>
  );
}
export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="site-header mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-5 py-6 md:flex-nowrap md:px-10">
      <Brand />
      <nav
        aria-label="Main navigation"
        className="order-last mt-2 flex w-full items-center justify-center gap-1 rounded-full bg-primary p-1.5 text-[10px] text-primary-foreground md:order-none md:mt-0 md:w-auto md:text-xs"
      >
        {[
          ["/", "The experience"],
          ["/chambers", "Four chambers"],
          ["/display", "Live tree"],
        ].map(([href, label]) => (
          <Link
            key={href}
            href={href}
            aria-current={pathname === href ? "page" : undefined}
            className={`flex min-h-10 items-center gap-2 whitespace-nowrap rounded-full px-2.5 py-2 md:px-5 md:py-3 ${pathname === href ? "bg-card text-foreground" : "hover:bg-white/10"}`}
          >
            {label}
            {href === "/display" && <ArrowUpRight size={14} />}
          </Link>
        ))}
      </nav>
      <Link
        href="/join"
        className="flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-card px-4 text-xs font-medium sm:px-5"
      >
        Add a hope <ArrowUpRight size={15} />
      </Link>
    </header>
  );
}
export function SiteFooter() {
  return (
    <footer className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-6 py-8 text-[11px] text-foreground/55 md:px-10">
      <span>Rooted in values. Growing through people.</span>
      <div className="flex flex-wrap gap-x-5 gap-y-3">
        <Link href="/privacy">Participation & privacy</Link>
        <Link href="/admin">Staff console</Link>
        <span>Gelephu experience centre · Hackathon</span>
      </div>
    </footer>
  );
}
