"use client";

import type { Timeline } from "@/lib/types";

interface ConstellationMapProps {
  timelines?: Timeline[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  alias?: string;
  compact?: boolean;
}

const sampleTimelines: Timeline[] = [
  {
    id: "sample-resonance",
    name: "Resonance",
    archetype: "The self that begins",
    probability: 68,
    signal: "stable",
    thesis: "",
    futureMemory: "",
    firstMove: "",
    risk: "",
    x: 73,
    y: 25,
    color: "lime",
  },
  {
    id: "sample-singularity",
    name: "Singularity",
    archetype: "The self that commits",
    probability: 41,
    signal: "volatile",
    thesis: "",
    futureMemory: "",
    firstMove: "",
    risk: "",
    x: 82,
    y: 71,
    color: "violet",
  },
  {
    id: "sample-wild",
    name: "Wild orbit",
    archetype: "The self you cannot predict",
    probability: 17,
    signal: "rare",
    thesis: "",
    futureMemory: "",
    firstMove: "",
    risk: "",
    x: 27,
    y: 73,
    color: "coral",
  },
];

const stars = Array.from({ length: 64 }, (_, index) => ({
  x: (index * 83 + 29) % 1000,
  y: (index * 137 + 47) % 700,
  radius: index % 9 === 0 ? 1.8 : index % 4 === 0 ? 1.1 : 0.65,
  opacity: 0.18 + ((index * 7) % 50) / 100,
}));

export default function ConstellationMap({
  timelines,
  selectedId,
  onSelect,
  alias = "YOU / NOW",
  compact = false,
}: ConstellationMapProps) {
  const nodes = timelines?.length ? timelines : sampleTimelines;

  return (
    <div
      className={`constellation-map ${compact ? "constellation-map--compact" : ""}`}
      aria-label="Interactive map of possible future selves"
    >
      <div className="map-coordinate map-coordinate--top">
        POSSIBILITY FIELD / {timelines ? "LIVE" : "UNOBSERVED"}
      </div>
      <div className="map-coordinate map-coordinate--side">T + FUTURE</div>

      <svg
        className="constellation-space"
        viewBox="0 0 1000 700"
        role="presentation"
        aria-hidden="true"
      >
        <defs>
          <filter id="soft-glow">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="edge-fade" x1="0" x2="1">
            <stop offset="0" stopColor="#f2f0e8" stopOpacity="0.08" />
            <stop offset="0.5" stopColor="#f2f0e8" stopOpacity="0.4" />
            <stop offset="1" stopColor="#d6ff62" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {stars.map((star, index) => (
          <circle
            key={index}
            cx={star.x}
            cy={star.y}
            r={star.radius}
            fill="#f2f0e8"
            opacity={star.opacity}
          />
        ))}

        <ellipse
          className="orbit orbit--outer"
          cx="500"
          cy="350"
          rx="342"
          ry="230"
        />
        <ellipse
          className="orbit orbit--middle"
          cx="500"
          cy="350"
          rx="245"
          ry="160"
        />
        <circle className="orbit orbit--inner" cx="500" cy="350" r="87" />

        {nodes.map((node, index) => {
          const nodeX = node.x * 10;
          const nodeY = node.y * 7;
          const bendX = 500 + (nodeX - 500) * 0.42 + (index - 1) * 70;
          const bendY = 350 + (nodeY - 350) * 0.38 - 35;
          return (
            <path
              key={node.id}
              className={`possibility-edge ${
                selectedId === node.id ? "possibility-edge--active" : ""
              }`}
              d={`M 500 350 Q ${bendX} ${bendY} ${nodeX} ${nodeY}`}
              fill="none"
              stroke="url(#edge-fade)"
            />
          );
        })}

        <circle
          className="core-aura"
          cx="500"
          cy="350"
          r="47"
          filter="url(#soft-glow)"
        />
        <circle className="core-dot" cx="500" cy="350" r="5" />
      </svg>

      <div className="present-self" aria-hidden="true">
        <span className="present-self__mark" />
        <span>{alias}</span>
      </div>

      {nodes.map((node) => (
        <button
          key={node.id}
          type="button"
          className={`future-node future-node--${node.color} ${
            selectedId === node.id ? "future-node--selected" : ""
          }`}
          style={{ left: `${node.x}%`, top: `${node.y}%` }}
          onClick={() => onSelect?.(node.id)}
          aria-pressed={selectedId === node.id}
        >
          <span className="future-node__halo" />
          <span className="future-node__point" />
          <span className="future-node__copy">
            <span className="future-node__probability">
              {node.probability}% SIGNAL
            </span>
            <strong>{node.name}</strong>
            <span>{node.archetype}</span>
          </span>
        </button>
      ))}

      <div className="map-legend">
        <span>
          <i className="legend-dot legend-dot--stable" /> Stable
        </span>
        <span>
          <i className="legend-dot legend-dot--volatile" /> Volatile
        </span>
        <span>
          <i className="legend-dot legend-dot--rare" /> Rare
        </span>
      </div>
    </div>
  );
}
