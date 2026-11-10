"use client";
import Link from "next/link";
import { ArrowUpRight, ArrowRight, MoveUpRight } from "lucide-react";
import { useTree } from "@/hooks/use-tree";
import { TreeCanvas } from "@/features/display/tree-canvas";
import { Button } from "@/components/ui/button";
import { themes } from "@/lib/catalog";
export function HomeExperience() {
  const { tree } = useTree();
  return (
    <>
      <section className="mx-auto grid max-w-7xl items-stretch px-5 pb-8 pt-6 md:grid-cols-[.95fr_1.05fr] md:px-10 md:pt-10">
        <div className="flex flex-col justify-center pb-12 pt-8 md:py-14 md:pr-12">
          <p className="eyebrow mb-8 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#75916d]" />A shared
            future. One hope at a time.
          </p>
          <h1 className="text-[clamp(3.5rem,6vw,6rem)] leading-[1.04] tracking-[-.05em]">
            A city grows.
            <br />
            So do our <em className="text-[#8a743c]">hopes.</em>
          </h1>
          <p className="mt-7 max-w-sm text-base leading-relaxed text-foreground/65">
            What future do you imagine for Gelephu Mindfulness City? Add your
            voice to a living tree of possibility.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-5">
            <Button asChild size="lg">
              <Link href="/join">
                Grow your leaf <ArrowUpRight size={18} />
              </Link>
            </Button>
            <Link
              href="/display"
              className="inline-flex items-center gap-2 text-xs"
            >
              Visit the living tree <ArrowRight size={15} />
            </Link>
          </div>
          <div className="mt-12 flex items-center gap-5 border-t border-border pt-6">
            <span className="serif text-4xl">{tree?.total ?? "—"}</span>
            <div className="text-xs leading-relaxed text-foreground/60">
              hopes taking root
              <br />
              {tree?.stats.demo
                ? `${tree.stats.demo} labelled demo leaves included`
                : "Every leaf begins with someone like you."}
            </div>
          </div>
        </div>
        <div className="forest grain relative flex min-h-[430px] flex-col items-center justify-center overflow-hidden rounded-t-[180px] rounded-b-2xl p-5 md:rounded-t-[240px]">
          <div className="absolute left-8 right-8 top-9 flex items-center justify-between text-[9px] uppercase tracking-[.18em] text-white/55">
            <span>
              {tree?.leaves.length
                ? "The collective canopy"
                : "A canopy of possibility"}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-[#b9d9a6]" />
              Living & growing
            </span>
          </div>
          <TreeCanvas
            leaves={tree?.leaves || []}
            illustrative={!tree?.leaves.length}
            settings={tree?.settings}
            className="w-full pt-9"
          />
          <span className="absolute bottom-8 serif text-sm italic text-[#d4c69e]">
            Rooted in values. Growing through people.
          </span>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 py-16 md:px-10">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow mb-3 text-foreground/55">
              A small moment. A shared possibility.
            </p>
            <h2 className="text-4xl tracking-tight">
              Your hope has a place here.
            </h2>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-foreground/60">
            No account. No app. Just a moment to imagine something good.
          </p>
        </div>
        <div className="grid gap-8 border-t border-border pt-8 sm:grid-cols-3">
          {[
            [
              "01",
              "Pause & imagine",
              "Choose what matters to you. Share one hope for the city's future.",
            ],
            [
              "02",
              "Watch it take root",
              "Your approved hope becomes a glowing leaf on our shared tree.",
            ],
            [
              "03",
              "Follow your curiosity",
              "Discover a chamber that connects with your vision of tomorrow.",
            ],
          ].map(([number, title, body]) => (
            <div key={number}>
              <span className="text-xs text-[#9b824b]">{number} /</span>
              <h3 className="mb-3 mt-5 text-2xl">{title}</h3>
              <p className="max-w-xs text-sm leading-relaxed text-foreground/60">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>
      <section className="mx-auto mb-16 max-w-7xl px-6 md:px-10">
        <div className="rounded-2xl border border-border px-7 py-8">
          <p className="eyebrow mb-6 text-foreground/50">
            Many branches. One shared future.
          </p>
          <div className="flex flex-wrap gap-x-8 gap-y-4">
            {themes.map((theme) => (
              <Link
                href={`/join?theme=${theme.id}`}
                key={theme.id}
                className="group flex items-center gap-2 text-xs"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: theme.color }}
                />
                {theme.label}
                <MoveUpRight
                  size={12}
                  className="opacity-0 transition-opacity group-hover:opacity-60"
                />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
