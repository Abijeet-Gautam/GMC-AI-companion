"use client";
import { useId } from "react";
import { motion } from "motion/react";
import { chambers, chamberDetails, type ChamberId } from "@/lib/catalog";

const rooms = [
  {
    id: 1,
    points: "355,295 470,236 622,316 508,379",
    x: 490,
    y: 304,
    color: "#95bae8",
  },
  {
    id: 2,
    points: "180,199 300,137 440,211 318,278",
    x: 311,
    y: 207,
    color: "#a6c99c",
  },
  {
    id: 3,
    points: "60,98 170,40 290,105 179,166",
    x: 173,
    y: 103,
    color: "#dace92",
  },
  {
    id: 4,
    points: "330,106 430,51 588,137 489,190",
    x: 459,
    y: 122,
    color: "#d9b3c5",
  },
] as const;
const routes = {
  1: "M665 312 L568 319 L490 304",
  2: "M665 312 L568 319 L467 262 L311 207",
  3: "M665 312 L568 319 L467 262 L311 207 L237 169 L173 103",
  4: "M665 312 L598 270 L544 204 L459 122",
};
export function ChamberMap({
  selected = 1,
  onSelect,
  compact = false,
}: {
  selected?: ChamberId;
  onSelect?: (id: ChamberId) => void;
  compact?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  return (
    <figure className={`chamber-map ${compact ? "is-compact" : ""}`}>
      <svg
        viewBox="0 0 820 430"
        role={onSelect ? "group" : "img"}
        aria-label={`Experience centre plan. Recommended: chamber ${selected}, ${chambers[selected]}. Reception is at the front right; chambers 1, 2 and 3 continue into the exhibition; chamber 4 is along the rear.`}
      >
        <defs>
          <pattern
            id={`${id}-grid`}
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M24 0H0V24"
              fill="none"
              stroke="#ffffff"
              strokeWidth=".4"
              opacity=".08"
            />
          </pattern>
        </defs>
        <rect width="820" height="430" rx="20" fill="#262c28" />
        <rect width="820" height="430" rx="20" fill={`url(#${id}-grid)`} />
        <path
          d="M179 166L300 137L489 190L588 137L750 263L700 345L622 316L508 379L355 295L318 278L180 199Z"
          fill="#454e46"
        />
        <path
          d="M355 295L508 379L622 316V331L508 394L355 310Z"
          fill="#171e19"
        />
        {rooms.map((room) => (
          <g
            key={room.id}
            role={onSelect ? "button" : undefined}
            tabIndex={onSelect ? 0 : undefined}
            aria-label={`Chamber ${room.id}: ${chambers[room.id]}`}
            aria-pressed={onSelect ? selected === room.id : undefined}
            onClick={() => onSelect?.(room.id)}
            onKeyDown={(event) => {
              if (onSelect && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                onSelect(room.id);
              }
            }}
            style={{ cursor: onSelect ? "pointer" : undefined }}
            data-chamber={room.id}
            data-recommended={selected === room.id}
          >
            <motion.polygon
              points={room.points}
              fill={selected === room.id ? room.color : "#626f62"}
              animate={{ opacity: selected === room.id ? 1 : 0.48 }}
              transition={{ duration: 0.35 }}
            />
            <path
              d={`M${room.x - 35} ${room.y + 10}l30 -16 48 26 -30 16Z`}
              fill="#ffffff"
              opacity={selected === room.id ? 0.2 : 0.07}
            />
            <circle
              cx={room.x}
              cy={room.y}
              r={selected === room.id ? 22 : 18}
              fill={selected === room.id ? "#d8ed92" : "#f3f4e9"}
            />
            <text
              x={room.x}
              y={room.y + 6}
              textAnchor="middle"
              fontSize="19"
              fontFamily="Arial, sans-serif"
              fill="#222c25"
              fontWeight="600"
            >
              {room.id}
            </text>
          </g>
        ))}
        <path d="M605 283L668 249L733 286L670 322Z" fill="#d8bc90" />
        <circle cx="665" cy="312" r="8" fill="#d8ed92" />
        <text x="679" y="340" fill="#f7f8ef" fontSize="17">
          Reception
        </text>
        <text x="605" y="203" fill="#d0d8c7" fontSize="12">
          Assistant &amp;
        </text>
        <text x="605" y="219" fill="#d0d8c7" fontSize="12">
          postcard board
        </text>
        <motion.path
          key={selected}
          d={routes[selected]}
          fill="none"
          stroke="#d8ed92"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="4 7"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8 }}
          pointerEvents="none"
        />
        <text x="34" y="398" fill="#d4ddca" fontSize="15">
          Your next stop: chamber {selected}
        </text>
      </svg>
      {!compact && (
        <div className="chamber-map-key">
          {rooms.map(({ id }) => (
            <button
              key={id}
              onClick={() => onSelect?.(id)}
              aria-pressed={selected === id}
              disabled={!onSelect}
            >
              <span>{id}</span>
              {chamberDetails[id].short}
            </button>
          ))}
        </div>
      )}
      <figcaption>
        Simplified from the supplied blueprint. Follow numbered signs on site.
      </figcaption>
    </figure>
  );
}
