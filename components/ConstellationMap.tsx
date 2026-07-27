"use client";

import type { ShadowOrbit, Timeline } from "@/lib/types";

interface ConstellationMapProps {
  timelines?: Timeline[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  shadowOrbit?: ShadowOrbit | null;
  alias?: string;
  compact?: boolean;
}

const sampleTimelines: Timeline[] = [
  {
    id: "sample-resonance",
    name: "The Steady Path",
    archetype: "Small steps become a habit",
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
    name: "The Focused Path",
    archetype: "You commit your full attention",
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
    name: "The Unexpected Path",
    archetype: "A surprise opportunity appears",
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

const sampleShadowOrbit: ShadowOrbit = {
  id: "sample-shadow",
  name: "The Hidden Path",
  archetype: "What happens if nothing changes",
  probability: 0,
  thesis: "",
  risk: "",
  disruptionMove: "",
  lastObservation: "Reality has not supplied enough evidence.",
  revealAfter: 3,
  evidenceCount: 0,
  revealed: false,
};

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
  shadowOrbit,
  alias = "YOU / TODAY",
  compact = false,
}: ConstellationMapProps) {
  const nodes = timelines?.length ? timelines : sampleTimelines;
  const shadow = timelines ? shadowOrbit : sampleShadowOrbit;

  return (
    <div
      className={`constellation-map ${compact ? "constellation-map--compact" : ""}`}
      aria-label="Interactive map of possible future paths"
    >
      <div className="map-coordinate map-coordinate--top">
        POSSIBLE PATHS / {timelines ? "YOUR MAP" : "EXAMPLE"}
      </div>
      <div className="map-coordinate map-coordinate--side">
        WHAT COULD HAPPEN NEXT
      </div>

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

        {shadow && (
          <path
            className={`shadow-edge ${
              selectedId === shadow.id ? "shadow-edge--active" : ""
            }`}
            d="M 500 350 Q 340 118 170 175"
            fill="none"
          />
        )}

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
              {node.probability}% MOMENTUM
            </span>
            <strong>{node.name}</strong>
            <span>{node.archetype}</span>
          </span>
        </button>
      ))}

      {shadow && (
        <button
          type="button"
          className={`shadow-node ${
            shadow.revealed ? "shadow-node--revealed" : "shadow-node--latent"
          } ${selectedId === shadow.id ? "shadow-node--selected" : ""}`}
          style={{ left: "17%", top: "25%" }}
          onClick={() => shadow.revealed && onSelect?.(shadow.id)}
          aria-pressed={selectedId === shadow.id}
          disabled={!shadow.revealed}
          aria-label={
            shadow.revealed
              ? `${shadow.name}, ${shadow.probability}% momentum`
              : `Hidden path: ${shadow.evidenceCount} of ${shadow.revealAfter} check-ins complete`
          }
        >
          <span className="shadow-node__orbit" />
          <span className="shadow-node__eclipse" />
          <span className="shadow-node__copy">
            <span>
              {shadow.revealed
                ? `${shadow.probability}% MOMENTUM`
                : `${shadow.evidenceCount}/${shadow.revealAfter} CHECK-INS`}
            </span>
            <strong>{shadow.revealed ? shadow.name : "Hidden path"}</strong>
            <small>
              {shadow.revealed
                ? shadow.archetype
                : `Complete ${shadow.revealAfter} check-ins to reveal it`}
            </small>
          </span>
        </button>
      )}

      <div className="map-legend">
        <span>
          <i className="legend-dot legend-dot--stable" /> Steady
        </span>
        <span>
          <i className="legend-dot legend-dot--volatile" /> High effort
        </span>
        <span>
          <i className="legend-dot legend-dot--rare" /> Unexpected
        </span>
        <span>
          <i className="legend-dot legend-dot--shadow" /> Hidden
        </span>
      </div>
    </div>
  );
}
