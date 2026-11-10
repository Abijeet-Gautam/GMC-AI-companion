"use client";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  Sprout,
  Sparkles,
  Compass,
} from "lucide-react";
import { useTree } from "@/hooks/use-tree";
import { TreeCanvas } from "@/features/display/tree-canvas";
import { Button } from "@/components/ui/button";
import { ThemeIcon } from "@/components/theme-icon";
import { themes } from "@/lib/catalog";
export function HomeExperience() {
  const { tree } = useTree();
  return (
    <>
      <section className="home-hero mx-auto max-w-[1440px] px-5 pb-5 pt-2 md:px-10">
        <div className="home-hero-card grid gap-4 rounded-[32px] bg-card p-3 md:grid-cols-[.95fr_1.05fr] md:p-4 lg:p-6">
          <div className="hero-copy flex flex-col justify-center px-2 py-4 md:px-6 md:py-7 lg:px-8">
            <p className="hero-kicker mb-5 flex items-center gap-2 text-[11px] text-foreground/65">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent">
                <Sprout size={13} />
              </span>
              A shared future. One hope at a time.
            </p>
            <h1 className="text-[clamp(2.2rem,5vw,5.3rem)] leading-[1.05] tracking-[-.065em]">
              A city grows.
              <br />
              So do our <span className="hero-highlight">hopes.</span>
            </h1>
            <p className="hero-description mt-5 max-w-sm text-sm leading-6 text-foreground/60 lg:text-base">
              What future do you imagine for Gelephu Mindfulness City? Add your
              voice to a living tree of possibility.
            </p>
            <div className="hero-actions mt-6 flex flex-wrap items-center gap-4">
              <Button asChild>
                <Link href="/join">
                  Grow your leaf <ArrowUpRight size={18} />
                </Link>
              </Button>
              <span className="hero-note text-[11px] text-foreground/50">
                No account. Just your imagination.
              </span>
            </div>
            <div className="hero-community mt-7 flex items-center gap-4">
              <div className="flex -space-x-2" aria-hidden="true">
                {themes.slice(0, 3).map((theme) => (
                  <span
                    key={theme.id}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-muted ring-4 ring-card"
                  >
                    <ThemeIcon theme={theme.id} size={16} />
                  </span>
                ))}
              </div>
              <p className="text-xs leading-5 text-foreground/55">
                <strong className="font-semibold text-foreground">
                  {tree?.total ?? "—"} {tree?.total === 1 ? "hope" : "hopes"}
                </strong>{" "}
                taking root. <br />
                Every voice makes it grow.
              </p>
            </div>
          </div>
          <div className="home-tree">
            <TreeCanvas
              leaves={tree?.leaves || []}
              illustrative={!tree?.leaves.length}
              settings={tree?.settings}
              contributionCount={tree?.total || 0}
              className="home-tree-canvas"
              showControls={false}
              environment="garden"
            />
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-[1440px] px-5 py-12 md:px-10 md:py-16">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="eyebrow mb-3 text-foreground/45">
              A moment for tomorrow
            </p>
            <h2 className="text-3xl tracking-tight md:text-4xl">
              Your hope has a place here.
            </h2>
          </div>
          <Link
            href="/join"
            className="flex min-h-11 items-center gap-3 text-xs"
          >
            Make it part of the story <ArrowRight size={15} />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              number: "01",
              title: "Pause & imagine",
              body: "Choose what matters to you. Share one hope for the city's future.",
              Icon: Sparkles,
            },
            {
              number: "02",
              title: "Watch it take root",
              body: "Your approved hope becomes a glowing leaf on our shared tree.",
              Icon: Sprout,
            },
            {
              number: "03",
              title: "Follow your curiosity",
              body: "Discover a chamber that connects with your vision of tomorrow.",
              Icon: Compass,
            },
          ].map(({ number, title, body, Icon }) => (
            <div key={number} className="rounded-3xl bg-card p-7">
              <div className="mb-9 flex items-center justify-between">
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-full ${number === "01" ? "bg-primary text-accent" : "bg-muted"}`}
                >
                  <Icon size={20} strokeWidth={1.5} />
                </span>
                <span className="text-[11px] text-foreground/35">
                  /{number}
                </span>
              </div>
              <h3 className="mb-3 text-xl">{title}</h3>
              <p className="max-w-xs text-sm leading-6 text-foreground/55">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>
      <section className="mx-auto mb-12 max-w-[1440px] px-5 md:px-10">
        <div className="rounded-[28px] bg-[#e0e3d5] p-6 md:p-9">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow mb-3 text-foreground/45">
                Many branches. One shared future.
              </p>
              <h2 className="text-2xl md:text-3xl">What matters to you?</h2>
            </div>
            <p className="max-w-xs text-xs leading-5 text-foreground/55">
              A thriving city starts with the things we care about.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {themes.map((theme) => (
              <Link
                href={`/join?theme=${theme.id}`}
                key={theme.id}
                className="group flex flex-col justify-between gap-6 rounded-2xl bg-card/80 p-4 transition-colors hover:bg-card"
              >
                <div className="flex items-center justify-between">
                  <ThemeIcon theme={theme.id} size={22} />
                  <ArrowUpRight
                    size={14}
                    className="text-foreground/35 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </div>
                <span className="text-xs leading-5">{theme.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
