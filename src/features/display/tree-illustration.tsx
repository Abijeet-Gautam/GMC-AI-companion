"use client";
import { useEffect, useId, useRef } from "react";
import { themes, type Leaf } from "@/lib/catalog";
import { defaultTreeSettings, type TreeSettings } from "@/lib/tree-settings";
import { treeGrowth } from "@/lib/tree-growth";
const centres = [
  [180, 225],
  [410, 170],
  [305, 105],
  [450, 310],
  [155, 350],
  [310, 280],
];
function random(seed: number) {
  // Integer arithmetic is identical in Node and browsers. A sine-based hash
  // produced different SVG attributes during hydration across V8 versions.
  let x = (seed + 0x9e3779b9) | 0;
  x = Math.imul(x ^ (x >>> 16), 0x21f0aaad);
  x = Math.imul(x ^ (x >>> 15), 0x735a2d97);
  return ((x ^ (x >>> 15)) >>> 0) / 4294967296;
}
const coordinate = (value: number) => Math.round(value * 1000) / 1000;
export function leafPosition(leaf: Leaf) {
  const index = themes.findIndex((theme) => theme.id === leaf.category),
    seed = Array.from(leaf.id).reduce(
      (a, c) => (a * 31 + c.charCodeAt(0)) >>> 0,
      7,
    );
  const angle = random(seed) * Math.PI * 2,
    radius = Math.sqrt(random(seed + 1)) * 78;
  return {
    x: coordinate(centres[index][0] + Math.cos(angle) * radius),
    y: coordinate(centres[index][1] + Math.sin(angle) * radius * 0.8),
    rotation: coordinate(random(seed + 2) * 140 - 70),
    index,
  };
}
export function TreeIllustration({
  leaves = [],
  activeId,
  arrivalId,
  arrivalIds = [],
  onSelect,
  illustrative = false,
  className = "",
  count = leaves.length,
  settings = defaultTreeSettings,
}: {
  leaves?: Leaf[];
  activeId?: string;
  arrivalId?: string;
  arrivalIds?: readonly string[];
  onSelect?: (leaf: Leaf) => void;
  illustrative?: boolean;
  className?: string;
  count?: number;
  settings?: TreeSettings;
}) {
  const id = useId().replace(/:/g, "");
  const growth = treeGrowth(count, settings),
    size =
      settings.growthMode === "manual"
        ? settings.age
        : 0.3 + (0.7 * (growth.progress - 0.38)) / 0.62;
  const arrivals = leaves.filter(
    (leaf) => arrivalIds.includes(leaf.id) || leaf.id === arrivalId,
  );
  return (
    <div
      className={`tree-stage ${className}`}
      style={
        {
          "--illustration-wind": `${settings.wind * 2}deg`,
        } as React.CSSProperties
      }
    >
      <svg
        viewBox="0 0 600 650"
        className="tree-svg"
        role="group"
        aria-label={
          illustrative
            ? "An illustration of the GM Tree"
            : "GM Tree. Select a glowing leaf to read a hope."
        }
      >
        <defs>
          <linearGradient id={`${id}-wood`} x1="0" y1="1" x2=".5" y2="0">
            <stop stopColor="#766346" />
            <stop offset=".5" stopColor="#b49b68" />
            <stop offset="1" stopColor="#d8c791" />
          </linearGradient>
          <radialGradient id={`${id}-halo`}>
            <stop stopColor="#b4c98f" stopOpacity=".12" />
            <stop offset="1" stopColor="#b4c98f" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="300" cy="265" r="260" fill={`url(#${id}-halo)`} />
        <g fill="none" stroke="#b7bb8a" opacity=".13">
          <circle cx="300" cy="280" r="245" strokeDasharray="1 10" />
          <circle cx="300" cy="280" r="215" />
          <path d="M70 550Q160 475 240 520T530 520M20 575Q150 525 260 555T580 540" />
        </g>
        <g transform={`translate(300 600) scale(${size}) translate(-300 -600)`}>
          <g className="illustration-branches">
            <g fill={`url(#${id}-wood)`}>
              <path d="M275 570C297 490 292 460 284 421C269 370 226 335 187 300C238 327 275 349 299 390C291 315 276 260 254 219C290 253 302 286 313 339C327 277 352 230 393 195C356 245 340 291 335 337C369 306 413 285 454 275C407 300 361 337 335 378C312 429 314 503 331 570Z" />
              <path d="M280 420Q211 389 125 356Q213 369 277 397ZM284 350Q201 284 153 227Q226 282 298 326ZM307 296Q286 195 306 135Q302 230 324 281ZM345 327Q426 232 453 179Q437 262 359 352Z" />
            </g>
            <g fill="none" stroke={`url(#${id}-wood)`} strokeLinecap="round">
              <path
                strokeWidth="5"
                d="M191 300Q169 270 183 178M234 341Q173 327 118 290M266 265Q233 201 219 154M349 288Q353 211 365 145M388 318Q455 310 490 325M374 252Q415 221 443 221M282 423Q222 443 178 424"
              />
              <path
                strokeWidth="2"
                d="M181 235L131 204M207 314L208 260M245 222L277 180M365 192L402 155M429 305L474 264M257 404L222 364M390 314L420 355"
              />
              <path
                strokeWidth="4"
                d="M300 550Q263 589 210 602M310 552Q334 590 394 601M300 563Q292 607 269 620M320 569Q356 579 441 581"
              />
            </g>
            <g className="ambient-canopy" aria-hidden="true">
              {Array.from(
                {
                  length:
                    settings.growthMode === "manual"
                      ? Math.round(220 * (1 - settings.season))
                      : 0,
                },
                (_, i) => {
                  const c = centres[i % 6],
                    angle = random(i + 5) * Math.PI * 2,
                    radius = Math.sqrt(random(i + 9)) * 100,
                    x = coordinate(c[0] + Math.cos(angle) * radius),
                    y = coordinate(c[1] + Math.sin(angle) * radius * 0.85);
                  return (
                    <path
                      key={i}
                      d="M0 0C-9-7-11-21 0-29C10-21 8-6 0 0Z"
                      transform={`translate(${x} ${y}) rotate(${random(i + 2) * 220 - 110}) scale(${0.45 + random(i + 17) * 0.5})`}
                      fill={
                        illustrative
                          ? themes[i % 6].color
                          : ["#718866", "#7f966e", "#91a17a", "#526d53"][i % 4]
                      }
                      opacity={
                        illustrative
                          ? 0.5 + random(i + 4) * 0.4
                          : 0.12 + random(i + 4) * 0.24
                      }
                    />
                  );
                },
              )}
            </g>
            <g aria-hidden="true">
              {Array.from({ length: 22 }, (_, i) => (
                <circle
                  key={i}
                  className="firefly"
                  cx={50 + random(i + 55) * 500}
                  cy={70 + random(i + 84) * 470}
                  r={1 + random(i + 2) * 1.4}
                  fill="#ead79c"
                  style={{ animationDelay: `${i * 0.4}s` }}
                />
              ))}
            </g>
            {leaves.map((leaf) => {
              const p = leafPosition(leaf);
              return (
                <g
                  key={leaf.id}
                  transform={`translate(${p.x} ${p.y}) rotate(${p.rotation})`}
                >
                  <g
                    className={`tree-leaf ${activeId === leaf.id ? "active-leaf" : ""}`}
                    role={onSelect ? "button" : undefined}
                    data-leaf-id={leaf.id}
                    tabIndex={onSelect ? 0 : undefined}
                    aria-label={
                      onSelect
                        ? `${themes[p.index].short}: ${leaf.leaf_message}`
                        : undefined
                    }
                    onClick={() => onSelect?.(leaf)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelect?.(leaf);
                      }
                    }}
                    style={{ cursor: onSelect ? "pointer" : undefined }}
                  >
                    <title>
                      {leaf.leaf_message}
                      {leaf.is_demo ? " (demo)" : ""}
                    </title>
                    <circle r="18" fill="transparent" />
                    <path
                      d="M0 8C-14-2-16-18 0-28C14-18 13-3 0 8Z"
                      fill={themes[p.index].color}
                    />
                    <path
                      d="M0 5V-23"
                      stroke="#f4efd0"
                      strokeWidth=".8"
                      opacity=".5"
                    />
                  </g>
                </g>
              );
            })}
            {arrivals.map((leaf, index) => (
              <ArrivalFlight key={leaf.id} leaf={leaf} index={index} />
            ))}
          </g>
        </g>
        <ellipse
          cx="300"
          cy="610"
          rx="135"
          ry="9"
          fill="#c1b47e"
          opacity=".06"
        />
      </svg>
    </div>
  );
}

function ArrivalFlight({ leaf, index }: { leaf: Leaf; index: number }) {
  const motion = useRef<SVGAnimateMotionElement>(null);
  const destination = leafPosition(leaf),
    delay = (index % 8) * 0.08;
  useEffect(() => {
    try {
      motion.current?.beginElementAt(delay);
    } catch {
      /* The settled leaf remains available without SMIL. */
    }
  }, [delay]);
  return (
    <g
      className="arrival-flight"
      aria-hidden="true"
      pointerEvents="none"
      style={{ animationDelay: `${delay}s` }}
    >
      <g>
        <path
          d="M0 8C-14-2-16-18 0-28C14-18 13-3 0 8Z"
          fill={themes[destination.index].color}
        />
        <animateMotion
          ref={motion}
          begin="indefinite"
          path={`M300 555 Q${destination.x < 300 ? 130 : 470} 360 ${destination.x} ${destination.y}`}
          dur="2s"
          fill="freeze"
          calcMode="spline"
          keyTimes="0;1"
          keySplines=".2 .6 .4 1"
        />
      </g>
    </g>
  );
}
