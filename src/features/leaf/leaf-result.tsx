"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  Copy,
  Download,
  Share2,
  Sprout,
} from "lucide-react";
import { themeFor, chambers, chamberDetails, type Leaf } from "@/lib/catalog";
import { Button } from "@/components/ui/button";
import { appUrl } from "@/lib/client";
export function LeafResult({
  leaf,
  keepsake = false,
}: {
  leaf: Leaf;
  keepsake?: boolean;
}) {
  const [notice, setNotice] = useState("");
  const theme = themeFor(leaf.category),
    chamber = chamberDetails[leaf.chamber_id];
  async function share() {
    const url = appUrl() + "/leaf/" + leaf.id;
    if (navigator.share)
      try {
        await navigator.share({
          title: "My hope for Gelephu",
          text: leaf.leaf_message,
          url,
        });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
      }
    try {
      await navigator.clipboard.writeText(url);
      setNotice("Your keepsake link is copied.");
    } catch {
      setNotice(url);
    }
  }
  function download() {
    const escape = (text: string) =>
      text.replace(
        /[<>&'"]/g,
        (char) =>
          ({
            "<": "&lt;",
            ">": "&gt;",
            "&": "&amp;",
            "'": "&apos;",
            '"': "&quot;",
          })[char]!,
      );
    const words = leaf.leaf_message.split(" "),
      lines: string[] = [];
    let line = "";
    for (const word of words) {
      if ((line + " " + word).length > 32) {
        lines.push(line);
        line = word;
      } else line += (line ? " " : "") + word;
    }
    if (line) lines.push(line);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000"><rect width="800" height="1000" fill="#252720"/><rect x="30" y="30" width="740" height="940" rx="25" fill="#34372d"/><text x="400" y="120" fill="#d8ed92" font-family="Arial" font-size="16" letter-spacing="4" text-anchor="middle">The Living Tree of Gelephu</text><path d="M400 350C290 270 290 175 400 160C500 215 500 295 400 350Z" fill="${theme.color}"/><path d="M400 325V205" stroke="#f8f1d8" opacity=".4"/>${lines.map((text, index) => `<text x="400" y="${470 + index * 48}" fill="#f8f1df" font-family="Georgia" font-size="30" text-anchor="middle">${escape(text)}</text>`).join("")}<text x="400" y="760" fill="#d8ed92" font-family="Arial" font-size="18" text-anchor="middle">${escape(theme.label)}</text><text x="400" y="825" fill="#f8f1df" font-family="Georgia" font-size="22" text-anchor="middle">Chamber ${leaf.chamber_id} · ${escape(chambers[leaf.chamber_id])}</text><text x="400" y="920" fill="#b9bdae" font-family="Arial" font-size="13" text-anchor="middle">${leaf.is_demo ? "Illustrative demo leaf · " : ""}Rooted in values. Growing through people.</text></svg>`;
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `gmc-leaf-${leaf.id.slice(0, 8)}.svg`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Your keepsake has been downloaded.");
  }
  return (
    <div className="space-y-6 soft-in">
      <div className="text-center">
        <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-accent/50">
          <Check size={21} />
        </span>
        <p className="eyebrow mb-3 text-foreground/45">
          {keepsake
            ? "A hope to carry with you"
            : "Your voice is part of the canopy"}
        </p>
        <h1 className="text-4xl tracking-tight">
          {keepsake ? "One leaf. A shared future." : "Your leaf is growing."}
        </h1>
        <p className="mt-3 text-sm text-foreground/60">
          {keepsake
            ? "A little keepsake from the Living Tree of Gelephu."
            : `Look for leaf #${leaf.id.slice(0, 6)} on the big screen. You've helped the tree grow.`}
        </p>
      </div>
      <section className="keepsake forest grain relative overflow-hidden rounded-[32px] px-7 pb-8 pt-9 text-center">
        <p className="eyebrow text-[8px] text-accent">
          The Living Tree of Gelephu
        </p>
        <svg
          className="mx-auto my-5 h-28 w-24"
          viewBox="0 0 100 120"
          aria-hidden="true"
        >
          <path
            d="M50 105C-5 75 5 18 60 8C105 35 100 88 50 105Z"
            fill={theme.color}
          />
          <path
            d="M46 111L60 26"
            fill="none"
            stroke="#faf0cb"
            strokeWidth="1.5"
            opacity=".55"
          />
        </svg>
        <blockquote className="serif mx-auto max-w-sm text-[27px] leading-snug">
          &ldquo;{leaf.leaf_message}&rdquo;
        </blockquote>
        <p
          className="mt-6 text-[10px] tracking-[.15em]"
          style={{ color: theme.color }}
        >
          {theme.label}
        </p>
        <p className="mt-5 rounded-full bg-white/5 px-3 py-3 text-[9px] text-white/45">
          {leaf.is_demo ? "Illustrative demo leaf · " : ""}Anonymous hope ·{" "}
          {new Date(leaf.created_at).toLocaleDateString("en-GB", {
            timeZone: "Asia/Thimphu",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </section>
      <div className="no-print grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={share}>
          <Share2 size={15} />
          Share leaf
        </Button>
        <Button variant="secondary" onClick={download}>
          <Download size={15} />
          Save keepsake
        </Button>
      </div>
      <p
        role="status"
        className="break-all text-center text-xs text-foreground/60"
      >
        {notice}
      </p>
      <section className="rounded-xl bg-card p-6">
        <p className="eyebrow mb-3 text-foreground/45">
          Your next discovery · Chamber {leaf.chamber_id}
        </p>
        <h2 className="mb-3 text-3xl">{chambers[leaf.chamber_id]}</h2>
        <p className="text-sm leading-relaxed text-foreground/65">
          {leaf.chamber_reason}
        </p>
        <p className="mt-3 text-xs leading-relaxed text-foreground/50">
          {chamber.description}
        </p>
        <Button asChild className="mt-5 w-full">
          <Link href={`/chambers#chamber-${leaf.chamber_id}`}>
            Explore the chambers <ArrowUpRight size={16} />
          </Link>
        </Button>
      </section>
      <p className="text-center text-[10px] leading-relaxed text-foreground/50">
        {leaf.mode === "offline"
          ? "Your leaf uses a curated offline response inspired by your theme and keywords."
          : "Your leaf was interpreted with OpenAI and checked before publication."}{" "}
        Chamber connections are suggested pathways for this project.
      </p>
      {!keepsake && (
        <Link
          href={`/leaf/${leaf.id}`}
          className="flex min-h-11 items-center justify-center gap-2 text-xs underline underline-offset-4"
        >
          <Copy size={13} />
          Open your keepsake page
        </Link>
      )}
      {keepsake && (
        <div className="no-print text-center">
          <Button asChild>
            <Link href="/join">
              Grow your own leaf <Sprout size={16} />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
