import Link from "next/link";
import { ArrowUpRight, MapPin, ChevronDown } from "lucide-react";
import { chambers, chamberDetails, type ChamberId } from "@/lib/catalog";
import { ChamberMap } from "./chamber-map";
export function ChamberRecommendation({
  chamber,
  reason,
  expanded = false,
}: {
  chamber: ChamberId;
  reason?: string;
  expanded?: boolean;
}) {
  return (
    <section
      className="chamber-recommendation"
      aria-label="Recommended chamber"
    >
      <div className="flex items-start gap-3">
        <span className="chamber-number">{chamber}</span>
        <div className="min-w-0">
          <p className="mb-1 text-[10px] text-foreground/50">
            Your next stop · Chamber {chamber}
          </p>
          <h2 className="text-lg leading-tight">{chambers[chamber]}</h2>
        </div>
        <MapPin size={17} className="ml-auto shrink-0 opacity-45" />
      </div>
      <p className="mt-3 text-xs leading-relaxed text-foreground/65">
        {reason || chamberDetails[chamber].reason}
      </p>
      <details open={expanded || undefined} className="chamber-route">
        <summary>
          Find it on the plan
          <ChevronDown size={14} />
        </summary>
        <ChamberMap selected={chamber} compact />
        <p className="mt-3 text-xs leading-relaxed">
          {chamberDetails[chamber].direction}
        </p>
      </details>
      <Link
        href={`/chambers#chamber-${chamber}`}
        className="mt-2 inline-flex min-h-9 items-center gap-2 text-xs font-medium"
      >
        Explore the chambers
        <ArrowUpRight size={13} />
      </Link>
    </section>
  );
}
