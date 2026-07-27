"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import ConstellationMap from "@/components/ConstellationMap";
import {
  adoptSimulationBorrowedLight,
  evolveSimulationConstellation,
  resolveSimulationSignature,
} from "@/lib/demo-engine";
import type {
  BorrowedLight,
  BorrowedLightField,
  CheckIn,
  Constellation,
  EnergyPattern,
  Friction,
  PulseMetrics,
} from "@/lib/types";

type EngineMode = "loading" | "neural" | "simulation";

interface EngineStatus {
  mode: "neural" | "simulation";
  engine: string;
  schemaReady: boolean;
}

const frictionOptions: Array<{ value: Friction; label: string }> = [
  { value: "starting", label: "I orbit the start" },
  { value: "consistency", label: "I lose the rhythm" },
  { value: "overwhelm", label: "Too many trajectories" },
  { value: "confidence", label: "I hide the signal" },
  { value: "direction", label: "No north star" },
];

const energyOptions: Array<{ value: EnergyPattern; label: string }> = [
  { value: "dawn", label: "Dawn / quiet charge" },
  { value: "midday", label: "Midday / full signal" },
  { value: "dusk", label: "Dusk / second wind" },
  { value: "unpredictable", label: "Chaotic / no pattern" },
];

const architecture = [
  {
    index: "01",
    label: "OBSERVE",
    title: "Describe a future worth becoming.",
    copy: "Aliya captures constraints, energy, friction, and ambition without collecting an email or legal name.",
  },
  {
    index: "02",
    label: "BRANCH",
    title: "Neural Pulse grows a causal possibility graph.",
    copy: "A cognitive twin, three visible futures, a hidden orbit, reality tests, and missions live as queryable Virtual Database records.",
  },
  {
    index: "03",
    label: "ALTER",
    title: "Real evidence changes the field.",
    copy: "Each check-in is stored as an identity signal. Neural Pulse retrieves the graph and mutates every future from what actually happened.",
  },
];

function readableDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function readableMoment(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getOrCreateVisitorId(): string {
  const storageKey = "aliya:visitor-id";
  const existing = window.localStorage.getItem(storageKey);
  if (existing) return existing;
  const id = crypto.randomUUID();
  window.localStorage.setItem(storageKey, id);
  return id;
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(payload.error || `Request failed with ${response.status}.`);
  }
  return payload;
}

export default function AliyaApp() {
  const [engineMode, setEngineMode] = useState<EngineMode>("loading");
  const [metrics, setMetrics] = useState<PulseMetrics>({
    explorers: 0,
    constellations: 0,
    checkIns: 0,
    mode: "simulation",
  });
  const [visitorId, setVisitorId] = useState("");
  const [portalOpen, setPortalOpen] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [pendingNexusEvidence, setPendingNexusEvidence] = useState(false);
  const [constellation, setConstellation] = useState<Constellation | null>(
    null,
  );
  const [selectedTimelineId, setSelectedTimelineId] = useState<string | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [signatureBusyId, setSignatureBusyId] = useState<string | null>(null);
  const [borrowBusyKey, setBorrowBusyKey] = useState<string | null>(null);
  const [rewindSignalId, setRewindSignalId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [borrowedLight, setBorrowedLight] = useState<BorrowedLightField>({
    unlocked: false,
    contributors: 0,
    requiredContributors: 3,
    suggestions: [],
  });

  const [alias, setAlias] = useState("");
  const [objective, setObjective] = useState("");
  const [horizonDays, setHorizonDays] = useState<30 | 60 | 90>(60);
  const [minutesPerDay, setMinutesPerDay] = useState(30);
  const [friction, setFriction] = useState<Friction>("starting");
  const [energyPattern, setEnergyPattern] =
    useState<EnergyPattern>("dusk");
  const [reflection, setReflection] = useState("");
  const [energy, setEnergy] = useState<1 | 2 | 3 | 4 | 5>(3);

  useEffect(() => {
    const currentVisitorId = getOrCreateVisitorId();
    setVisitorId(currentVisitorId);

    async function boot() {
      try {
        const statusResponse = await fetch("/api/status", {
          cache: "no-store",
        });
        const status = await readJson<EngineStatus>(statusResponse);
        setEngineMode(status.mode);

        const storedTwinId = window.localStorage.getItem("aliya:twin-id");
        if (status.mode === "neural" && storedTwinId) {
          const response = await fetch(
            `/api/constellation?visitorId=${encodeURIComponent(
              currentVisitorId,
            )}&twinId=${encodeURIComponent(storedTwinId)}`,
            { cache: "no-store" },
          );
          if (response.ok) {
            const restored = await response.json();
            setConstellation(restored);
            setSelectedTimelineId(
              restored.selectedTimelineId ?? restored.timelines[0]?.id ?? null,
            );
          }
        }

        void fetch("/api/metrics", { cache: "no-store" })
          .then(async (metricsResponse) => {
            if (metricsResponse.ok) {
              setMetrics(await metricsResponse.json());
            }
          })
          .catch(() => undefined);

        void refreshBorrowedLight();
      } catch {
        setEngineMode("simulation");
      }
    }

    void boot();
  }, []);

  const selectedTimeline = useMemo(() => {
    if (!constellation) return null;
    if (constellation.shadowOrbit?.id === selectedTimelineId) return null;
    return (
      constellation.timelines.find(
        (timeline) => timeline.id === selectedTimelineId,
      ) ??
      constellation.timelines[0] ??
      null
    );
  }, [constellation, selectedTimelineId]);
  const selectedShadow =
    constellation?.shadowOrbit?.id === selectedTimelineId
      ? constellation.shadowOrbit
      : null;
  const selectedSignature = useMemo(
    () =>
      constellation?.realitySignatures.find(
        (signature) => signature.timelineId === selectedTimeline?.id,
      ) ?? null,
    [constellation, selectedTimeline],
  );
  const rewindMoment = useMemo(
    () =>
      constellation?.evidenceHistory.find(
        (moment) => moment.id === rewindSignalId,
      ) ?? null,
    [constellation, rewindSignalId],
  );
  const rewoundTimelines = useMemo(() => {
    if (!constellation || !rewindMoment) return [];
    const deltas = new Map(
      rewindMoment.deltas.map((delta) => [delta.nodeId, delta.delta]),
    );
    return constellation.timelines.map((timeline) => ({
      ...timeline,
      rewoundProbability: Math.max(
        1,
        Math.min(99, timeline.probability - (deltas.get(timeline.id) ?? 0)),
      ),
    }));
  }, [constellation, rewindMoment]);

  const completedMissionCount =
    constellation?.missions.filter((mission) => mission.completed).length ?? 0;

  async function refreshBorrowedLight() {
    try {
      const response = await fetch("/api/borrowed-light", {
        cache: "no-store",
      });
      if (response.ok) {
        setBorrowedLight(await response.json());
      }
    } catch {
      return;
    }
  }

  async function createConstellation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!visitorId) return;
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/manifest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorId,
          alias,
          objective,
          horizonDays,
          minutesPerDay,
          friction,
          energyPattern,
        }),
      });
      const nextConstellation = await readJson<Constellation>(response);
      setConstellation(nextConstellation);
      setSelectedTimelineId(nextConstellation.timelines[0]?.id ?? null);
      setRewindSignalId(null);
      setPendingNexusEvidence(false);
      setEngineMode(nextConstellation.mode);
      setPortalOpen(false);
      if (nextConstellation.mode === "neural") {
        window.localStorage.setItem(
          "aliya:twin-id",
          nextConstellation.id,
        );
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The possibility field could not be opened.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function submitCheckIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!constellation || !selectedTimeline) return;
    setBusy(true);
    setError("");

    const checkIn: CheckIn = {
      visitorId,
      constellationId: constellation.id,
      timelineId: selectedTimeline.id,
      reflection,
      energy,
      ...(pendingNexusEvidence && constellation.nexusMove
        ? { nexusMoveId: constellation.nexusMove.id }
        : {}),
    };

    try {
      let evolved: Constellation;
      if (constellation.mode === "simulation") {
        evolved = evolveSimulationConstellation(constellation, checkIn);
      } else {
        const response = await fetch("/api/check-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(checkIn),
        });
        evolved = await readJson<Constellation>(response);
      }
      setConstellation(evolved);
      setReflection("");
      setCheckInOpen(false);
      setPendingNexusEvidence(false);
      setRewindSignalId(
        evolved.evidenceHistory.at(-1)?.id ?? rewindSignalId,
      );
      if (evolved.mode === "neural") {
        setMetrics((current) => ({
          ...current,
          checkIns: current.checkIns + 1,
        }));
        void refreshBorrowedLight();
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The signal could not be absorbed.",
      );
    } finally {
      setBusy(false);
    }
  }

  function closeCheckIn() {
    setCheckInOpen(false);
    setPendingNexusEvidence(false);
    setReflection("");
    setError("");
  }

  function openTimelineCheckIn(timelineId: string, prompt = "") {
    setSelectedTimelineId(timelineId);
    setPendingNexusEvidence(false);
    setReflection(prompt);
    setError("");
    setCheckInOpen(true);
  }

  function openNexusCheckIn() {
    if (!constellation?.nexusMove) return;
    const target =
      selectedTimeline ??
      [...constellation.timelines].sort(
        (left, right) => right.probability - left.probability,
      )[0];
    if (!target) return;
    setSelectedTimelineId(target.id);
    setPendingNexusEvidence(true);
    setReflection(
      `I completed the Nexus Move: ${constellation.nexusMove.title}. The observable proof is `,
    );
    setError("");
    setCheckInOpen(true);
  }

  function openShadowDisruption() {
    if (!constellation?.shadowOrbit) return;
    const target = [...constellation.timelines].sort(
      (left, right) => right.probability - left.probability,
    )[0];
    if (!target) return;
    openTimelineCheckIn(
      target.id,
      `I disrupted ${constellation.shadowOrbit.name} by taking this action: `,
    );
  }

  async function resolveSignature(
    signatureId: string,
    outcome: "observed" | "contradicted",
  ) {
    if (!constellation) return;
    setSignatureBusyId(signatureId);
    setError("");
    try {
      let evolved: Constellation;
      if (constellation.mode === "simulation") {
        evolved = resolveSimulationSignature(
          constellation,
          signatureId,
          outcome,
        );
      } else {
        const response = await fetch("/api/signature", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visitorId,
            constellationId: constellation.id,
            signatureId,
            outcome,
          }),
        });
        evolved = await readJson<Constellation>(response);
      }
      setConstellation(evolved);
      setRewindSignalId(evolved.evidenceHistory.at(-1)?.id ?? null);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Reality could not be written back to the field.",
      );
    } finally {
      setSignatureBusyId(null);
    }
  }

  async function borrowMove(move: BorrowedLight) {
    if (!constellation) return;
    setBorrowBusyKey(move.moveKey);
    setError("");
    try {
      let evolved: Constellation;
      if (constellation.mode === "simulation") {
        evolved = adoptSimulationBorrowedLight(constellation, move);
      } else {
        const response = await fetch("/api/borrowed-light", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visitorId,
            constellationId: constellation.id,
            moveKey: move.moveKey,
          }),
        });
        evolved = await readJson<Constellation>(response);
      }
      setConstellation(evolved);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The borrowed move could not enter this field.",
      );
    } finally {
      setBorrowBusyKey(null);
    }
  }

  function resetObservatory() {
    setConstellation(null);
    setSelectedTimelineId(null);
    setReflection("");
    setRewindSignalId(null);
    setPendingNexusEvidence(false);
    setCheckInOpen(false);
    setError("");
    window.localStorage.removeItem("aliya:twin-id");
  }

  const modeLabel =
    engineMode === "loading"
      ? "HANDSHAKE"
      : engineMode === "neural"
        ? "NEURAL PULSE / LINKED"
        : "SIMULATION / PREVIEW";

  return (
    <main className="site-shell">
      <div className="noise" aria-hidden="true" />
      <header className="site-header">
        <button
          className="wordmark"
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Aliya home"
        >
          <span className="wordmark__sigil" aria-hidden="true">
            A
          </span>
          <span>
            <strong>ALIYA</strong>
            <small>POSSIBLE-SELF OBSERVATORY</small>
          </span>
        </button>

        <div className={`engine-link engine-link--${engineMode}`}>
          <span className="engine-link__pulse" />
          <span>{modeLabel}</span>
        </div>

        <button
          type="button"
          className="header-action"
          onClick={() =>
            constellation ? resetObservatory() : setPortalOpen(true)
          }
        >
          {constellation ? "New observation" : "Enter observatory"}
          <span aria-hidden="true">↗</span>
        </button>
      </header>

      {!constellation ? (
        <>
          <section className="hero-section">
            <div className="hero-copy">
              <p className="eyebrow">
                <span>◌</span> FUTURE IS A PROBABILITY FIELD
              </p>
              <h1>
                Meet the person
                <br />
                your next decision
                <br />
                <em>creates.</em>
              </h1>
              <p className="hero-intro">
                Aliya grows a living cognitive twin from your real actions,
                then renders the selves quietly forming around you.
              </p>
              <div className="hero-actions">
                <button
                  type="button"
                  className="primary-action"
                  onClick={() => setPortalOpen(true)}
                >
                  Observe my futures
                  <span className="primary-action__disc">↗</span>
                </button>
                <a href="#anatomy" className="text-action">
                  Examine the engine <span>↓</span>
                </a>
              </div>
              <div className="privacy-note">
                <span className="privacy-note__icon">◇</span>
                <span>
                  <strong>NO ACCOUNT REQUIRED</strong>
                  Anonymous cognitive signal only. Avoid personal or medical
                  information.
                </span>
              </div>
            </div>

            <div className="hero-field">
              <ConstellationMap />
              <div className="field-caption">
                <span>FIG. 01</span>
                <p>
                  Three futures can be true at once.
                  <br />
                  Evidence decides which one becomes real.
                </p>
              </div>
            </div>
          </section>

          <section className="manifesto-strip" aria-label="Product thesis">
            <div>
              <span>NOT A PLANNER</span>
              <strong>It models identity, not tasks.</strong>
            </div>
            <div>
              <span>NOT A CHATBOT</span>
              <strong>It remembers evidence, not conversation.</strong>
            </div>
            <div>
              <span>NOT A PREDICTION</span>
              <strong>It makes possibility actionable.</strong>
            </div>
          </section>

          <section className="anatomy-section" id="anatomy">
            <div className="section-heading">
              <p className="eyebrow">
                <span>△</span> ANATOMY OF AN OBSERVATION
              </p>
              <h2>
                Your ambition enters.
                <br />
                A living graph comes back.
              </h2>
            </div>

            <div className="architecture-grid">
              {architecture.map((item) => (
                <article key={item.index} className="architecture-card">
                  <div className="architecture-card__top">
                    <span>{item.index}</span>
                    <i />
                    <small>{item.label}</small>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.copy}</p>
                </article>
              ))}
            </div>

            <div className="neural-proof">
              <div className="neural-proof__orb" aria-hidden="true">
                <i />
                <i />
                <i />
                <span>NP</span>
              </div>
              <div>
                <p className="eyebrow">PRIMARY INTELLIGENCE LAYER</p>
                <h3>Evorozen Neural Pulse Virtual Database</h3>
                <p>
                  Eight queryable tables hold the twin, futures, missions,
                  temporal artifacts, evidence, causal edges, anonymous
                  borrowed moves, and adoption telemetry. Every check-in
                  retrieves that graph before Neural Pulse decides what
                  changes.
                </p>
              </div>
              <div className="proof-sequence" aria-label="Neural request flow">
                <span>INSERT SIGNAL</span>
                <b>→</b>
                <span>SELECT GRAPH</span>
                <b>→</b>
                <span>ROUTE LOGIC</span>
                <b>→</b>
                <span>MUTATE NODES</span>
              </div>
            </div>
          </section>
        </>
      ) : (
        <section className="observatory-section">
          <div className="observatory-heading">
            <div>
              <p className="eyebrow">
                <span>◉</span> OBSERVATION ACTIVE / {constellation.mode}
              </p>
              <h1>
                {constellation.alias}, your future
                <br />
                has <em>a hidden fourth.</em>
              </h1>
            </div>
            <div className="observation-meta">
              <span>HORIZON</span>
              <strong>{constellation.horizonDays} DAYS</strong>
              <span>FIELD ID</span>
              <strong>{constellation.id.slice(-10).toUpperCase()}</strong>
            </div>
          </div>

          {constellation.mode === "simulation" && (
            <div className="simulation-disclosure">
              <span>PREVIEW MODE</span>
              This field is locally simulated. Connect an Evorozen key before
              submission to persist the causal graph in Neural Pulse.
            </div>
          )}

          {error && (
            <div className="observation-error" role="alert">
              <span>FIELD INTERRUPT</span>
              {error}
            </div>
          )}

          <div className="observatory-grid">
            <div className="observatory-map-panel">
              <ConstellationMap
                timelines={constellation.timelines}
                selectedId={selectedTimelineId}
                onSelect={setSelectedTimelineId}
                shadowOrbit={constellation.shadowOrbit}
                alias={`${constellation.alias.toUpperCase()} / NOW`}
              />
              <div className="north-star">
                <span>NORTH STAR</span>
                <p>{constellation.northStar}</p>
              </div>
            </div>

            {selectedTimeline && (
              <aside
                className={`timeline-panel timeline-panel--${selectedTimeline.color}`}
              >
                <div className="timeline-panel__signal">
                  <span>{selectedTimeline.signal} trajectory</span>
                  <strong>{selectedTimeline.probability}%</strong>
                </div>
                <p className="timeline-panel__archetype">
                  {selectedTimeline.archetype}
                </p>
                <h2>{selectedTimeline.name}</h2>
                <p className="timeline-panel__thesis">
                  {selectedTimeline.thesis}
                </p>

                <div className="future-memory">
                  <span>MEMORY FROM DAY {constellation.horizonDays}</span>
                  <p>“{selectedTimeline.futureMemory}”</p>
                </div>

                <dl className="timeline-facts">
                  <div>
                    <dt>FIRST CAUSAL MOVE</dt>
                    <dd>{selectedTimeline.firstMove}</dd>
                  </div>
                  <div>
                    <dt>ORBITAL RISK</dt>
                    <dd>{selectedTimeline.risk}</dd>
                  </div>
                </dl>

                {selectedSignature && (
                  <section
                    className={`reality-signature reality-signature--${selectedSignature.status}`}
                  >
                    <div className="reality-signature__heading">
                      <span>REALITY SIGNATURE / {selectedSignature.window}</span>
                      <strong>{selectedSignature.status}</strong>
                    </div>
                    <p>{selectedSignature.description}</p>
                    <small>
                      LOOK FOR THIS BY {readableDate(selectedSignature.dueAt)}
                    </small>
                    {selectedSignature.status === "pending" ? (
                      <div className="reality-signature__actions">
                        <button
                          type="button"
                          disabled={signatureBusyId === selectedSignature.id}
                          onClick={() =>
                            void resolveSignature(
                              selectedSignature.id,
                              "observed",
                            )
                          }
                        >
                          I observed it
                        </button>
                        <button
                          type="button"
                          disabled={signatureBusyId === selectedSignature.id}
                          onClick={() =>
                            void resolveSignature(
                              selectedSignature.id,
                              "contradicted",
                            )
                          }
                        >
                          Reality said no
                        </button>
                      </div>
                    ) : (
                      <div className="reality-signature__resolved">
                        CALIBRATED AGAINST REALITY
                      </div>
                    )}
                  </section>
                )}

                <button
                  type="button"
                  className="primary-action primary-action--full"
                  onClick={() => openTimelineCheckIn(selectedTimeline.id)}
                >
                  Send evidence to this future
                  <span className="primary-action__disc">↗</span>
                </button>
              </aside>
            )}

            {selectedShadow && (
              <aside className="timeline-panel timeline-panel--shadow">
                <div className="timeline-panel__signal">
                  <span>shadow trajectory / revealed</span>
                  <strong>{selectedShadow.probability}%</strong>
                </div>
                <p className="timeline-panel__archetype">
                  {selectedShadow.archetype}
                </p>
                <h2>{selectedShadow.name}</h2>
                <p className="timeline-panel__thesis">
                  {selectedShadow.thesis}
                </p>

                <div className="shadow-observation">
                  <span>LAST OBSERVATION</span>
                  <p>{selectedShadow.lastObservation}</p>
                </div>

                <dl className="timeline-facts">
                  <div>
                    <dt>WHAT FEEDS THIS ORBIT</dt>
                    <dd>{selectedShadow.risk}</dd>
                  </div>
                  <div>
                    <dt>DISRUPTION MOVE</dt>
                    <dd>{selectedShadow.disruptionMove}</dd>
                  </div>
                </dl>

                <button
                  type="button"
                  className="primary-action primary-action--full"
                  onClick={openShadowDisruption}
                >
                  Disrupt this orbit
                  <span className="primary-action__disc">↗</span>
                </button>
              </aside>
            )}
          </div>

          {constellation.nexusMove && (
            <section
              className={`nexus-panel ${
                constellation.nexusMove.completed
                  ? "nexus-panel--complete"
                  : ""
              }`}
            >
              <div className="nexus-panel__mark" aria-hidden="true">
                <span>03</span>
                <i />
                <i />
                <i />
              </div>
              <div className="nexus-panel__copy">
                <p className="eyebrow">NEXUS MOVE / ONE ACTION, THREE FUTURES</p>
                <h2>{constellation.nexusMove.title}</h2>
                <p>{constellation.nexusMove.reason}</p>
                <small>
                  {constellation.nexusMove.minutes} MIN · PROOF:{" "}
                  {constellation.nexusMove.proof}
                </small>
              </div>
              <div className="nexus-panel__orbits">
                {constellation.timelines.map((timeline) => (
                  <span key={timeline.id}>{timeline.name}</span>
                ))}
              </div>
              <button
                type="button"
                className="secondary-action"
                disabled={constellation.nexusMove.completed}
                onClick={openNexusCheckIn}
              >
                {constellation.nexusMove.completed
                  ? "Signal woven across field"
                  : "I made the Nexus Move"}
                <span>{constellation.nexusMove.completed ? "✓" : "↗"}</span>
              </button>
            </section>
          )}

          <div className="evidence-grid">
            <section className="field-note-panel">
              <div className="panel-heading">
                <span>NEURAL FIELD NOTE</span>
                <i />
                <small>{constellation.traceId ? "TRACE LINKED" : "LOCAL"}</small>
              </div>
              <blockquote>{constellation.fieldNote}</blockquote>
            </section>

            <section className="missions-panel">
              <div className="panel-heading">
                <span>EVIDENCE MISSIONS</span>
                <i />
                <small>
                  {completedMissionCount}/{constellation.missions.length} SIGNALS
                </small>
              </div>
              <div className="mission-list">
                {constellation.missions.slice(-4).map((mission, index) => (
                  <article
                    key={mission.id}
                    className={mission.completed ? "mission--complete" : ""}
                  >
                    <span className="mission-index">
                      {mission.completed ? "✓" : String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3>{mission.title}</h3>
                      <p>{mission.reason}</p>
                      <small>
                        {mission.minutes} MIN · PROOF: {mission.proof}
                      </small>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <div className="temporal-lab">
            <section className="rewind-panel">
              <div className="panel-heading">
                <span>TEMPORAL REWIND</span>
                <i />
                <small>COUNTERFACTUAL LENS</small>
              </div>
              <div className="rewind-panel__intro">
                <h2>Remove one signal. Watch every future move.</h2>
                <p>
                  This does not erase history. It shows which probability
                  changes depended on one piece of evidence.
                </p>
              </div>

              {constellation.evidenceHistory.length ? (
                <>
                  <div className="rewind-history">
                    {[...constellation.evidenceHistory]
                      .reverse()
                      .slice(0, 6)
                      .map((moment) => (
                        <button
                          key={moment.id}
                          type="button"
                          className={
                            rewindSignalId === moment.id ? "active" : ""
                          }
                          onClick={() => setRewindSignalId(moment.id)}
                        >
                          <span>
                            {moment.source === "reality_signature"
                              ? "REALITY TEST"
                              : "IDENTITY SIGNAL"}
                          </span>
                          <strong>{moment.reflection}</strong>
                          <small>{readableMoment(moment.createdAt)}</small>
                        </button>
                      ))}
                  </div>

                  {rewindMoment ? (
                    <div className="rewind-comparison">
                      <p>IF THIS SIGNAL NEVER ENTERED THE FIELD</p>
                      {rewoundTimelines.map((timeline) => {
                        const delta =
                          rewindMoment.deltas.find(
                            (item) => item.nodeId === timeline.id,
                          )?.delta ?? 0;
                        return (
                          <div key={timeline.id}>
                            <span>{timeline.name}</span>
                            <strong>
                              {timeline.probability}%
                              <i>→</i>
                              {timeline.rewoundProbability}%
                            </strong>
                            <small>
                              {delta > 0 ? `−${delta}` : `+${Math.abs(delta)}`}{" "}
                              WITHOUT SIGNAL
                            </small>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="rewind-empty">
                      Choose an evidence moment to open its counterfactual.
                    </p>
                  )}
                </>
              ) : (
                <p className="rewind-empty">
                  The rewind chamber activates after your first real-world
                  signal.
                </p>
              )}
            </section>

            <section className="borrowed-light-panel">
              <div className="panel-heading">
                <span>BORROWED LIGHT</span>
                <i />
                <small>ANONYMOUS / AGGREGATED</small>
              </div>
              <div className="borrowed-light-panel__intro">
                <h2>Useful moves can travel. Personal stories cannot.</h2>
                <p>
                  Aliya shares only generic actions proven by distinct
                  explorers. No names, goals, reflections, or personal text
                  leave their fields.
                </p>
              </div>

              {borrowedLight.unlocked ? (
                <div className="borrowed-light-list">
                  {borrowedLight.suggestions.map((move) => {
                    const alreadyBorrowed = constellation.missions.some(
                      (mission) =>
                        mission.origin === "borrowed_light" &&
                        mission.title === move.title,
                    );
                    return (
                      <article key={move.moveKey}>
                        <span className="borrowed-light-list__uses">
                          PROVEN IN {move.uses} FIELDS
                        </span>
                        <h3>{move.title}</h3>
                        <p>{move.reason}</p>
                        <small>
                          {move.minutes} MIN · PROOF: {move.proof}
                        </small>
                        <button
                          type="button"
                          disabled={
                            alreadyBorrowed || borrowBusyKey === move.moveKey
                          }
                          onClick={() => void borrowMove(move)}
                        >
                          {alreadyBorrowed
                            ? "Already in your field"
                            : borrowBusyKey === move.moveKey
                              ? "Borrowing…"
                              : "Borrow this move"}
                        </button>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="borrowed-light-lock">
                  <div className="borrowed-light-lock__glyph" aria-hidden="true">
                    ◇
                  </div>
                  <div>
                    <span>COLLECTIVE THRESHOLD</span>
                    <strong>
                      {borrowedLight.contributors}/
                      {borrowedLight.requiredContributors} DISTINCT EXPLORERS
                    </strong>
                    <div className="borrowed-light-lock__track">
                      <i
                        style={{
                          width: `${Math.min(
                            100,
                            (borrowedLight.contributors /
                              borrowedLight.requiredContributors) *
                              100,
                          )}%`,
                        }}
                      />
                    </div>
                    <p>
                      Suggestions remain sealed until enough independent,
                      real contributions exist. Aliya will not invent a crowd.
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>
        </section>
      )}

      <footer className="site-footer">
        <div>
          <span className="wordmark__sigil">A</span>
          <p>
            ALIYA / Built for Evorozen Apex 2026
            <br />
            Next-Gen Consumer Tools
          </p>
        </div>
        <div className="traction-readout">
          <span>
            <strong>{metrics.explorers}</strong> EXPLORERS
          </span>
          <span>
            <strong>{metrics.constellations}</strong> FUTURES MAPPED
          </span>
          <span>
            <strong>{metrics.checkIns}</strong> SIGNALS RETURNED
          </span>
        </div>
        <p>
          Aliya is a reflection tool, not a medical, psychological, or
          predictive service.
        </p>
      </footer>

      {portalOpen && (
        <div
          className="portal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="portal-title"
        >
          <button
            type="button"
            className="portal-close"
            onClick={() => setPortalOpen(false)}
            aria-label="Close observation portal"
          >
            ×
          </button>
          <form className="portal-card" onSubmit={createConstellation}>
            <div className="portal-card__intro">
              <p className="eyebrow">NEW OBSERVATION / SIGNAL INTAKE</p>
              <h2 id="portal-title">Give the future something to work with.</h2>
              <p>
                Do not enter an email, legal name, health information, or other
                sensitive data.
              </p>
            </div>

            <div className="form-grid">
              <label className="field field--short">
                <span>WHAT SHOULD YOUR FUTURE CALL YOU?</span>
                <input
                  value={alias}
                  onChange={(event) => setAlias(event.target.value)}
                  maxLength={32}
                  placeholder="A first name or alias"
                  autoFocus
                  required
                />
              </label>

              <label className="field field--wide">
                <span>WHAT FUTURE ARE YOU TRYING TO MAKE REAL?</span>
                <textarea
                  value={objective}
                  onChange={(event) => setObjective(event.target.value)}
                  minLength={12}
                  maxLength={360}
                  placeholder="In 60 days, I want to have..."
                  rows={3}
                  required
                />
                <small>{objective.length}/360</small>
              </label>

              <fieldset className="field field--wide">
                <legend>WHERE DOES YOUR SIGNAL BREAK?</legend>
                <div className="choice-grid">
                  {frictionOptions.map((option) => (
                    <label key={option.value} className="choice-chip">
                      <input
                        type="radio"
                        name="friction"
                        value={option.value}
                        checked={friction === option.value}
                        onChange={() => setFriction(option.value)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="field">
                <span>ENERGY WINDOW</span>
                <select
                  value={energyPattern}
                  onChange={(event) =>
                    setEnergyPattern(event.target.value as EnergyPattern)
                  }
                >
                  {energyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <fieldset className="field">
                <legend>OBSERVATION HORIZON</legend>
                <div className="segmented-control">
                  {([30, 60, 90] as const).map((days) => (
                    <button
                      key={days}
                      type="button"
                      className={horizonDays === days ? "active" : ""}
                      onClick={() => setHorizonDays(days)}
                    >
                      {days}D
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="field field--wide range-field">
                <span>
                  DAILY ENERGY BUDGET <b>{minutesPerDay} MIN</b>
                </span>
                <input
                  type="range"
                  min="10"
                  max="120"
                  step="5"
                  value={minutesPerDay}
                  onChange={(event) =>
                    setMinutesPerDay(Number(event.target.value))
                  }
                />
              </label>
            </div>

            {error && <p className="form-error">{error}</p>}

            <button
              type="submit"
              className="primary-action primary-action--full portal-submit"
              disabled={busy}
            >
              {busy ? "Opening the possibility field…" : "Generate my futures"}
              <span className="primary-action__disc">
                {busy ? "◌" : "↗"}
              </span>
            </button>
          </form>
        </div>
      )}

      {checkInOpen && selectedTimeline && constellation && (
        <div
          className="portal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="checkin-title"
        >
          <button
            type="button"
            className="portal-close"
            onClick={closeCheckIn}
            aria-label="Close check-in"
          >
            ×
          </button>
          <form
            className="portal-card portal-card--checkin"
            onSubmit={submitCheckIn}
          >
            <div className="portal-card__intro">
              <p className="eyebrow">
                {pendingNexusEvidence ? "NEXUS SIGNAL" : "IDENTITY SIGNAL"} /{" "}
                {selectedTimeline.name.toUpperCase()}
              </p>
              <h2 id="checkin-title">
                {pendingNexusEvidence
                  ? "Show what crossed all three futures."
                  : "What evidence exists now?"}
              </h2>
              <p>
                {pendingNexusEvidence
                  ? "Report what actually happened. Neural Pulse will test the same action against every live trajectory."
                  : "Report what actually happened. Neural Pulse will retrieve the causal graph and recalculate every future."}
              </p>
            </div>

            <label className="field">
              <span>OBSERVABLE EVIDENCE</span>
              <textarea
                value={reflection}
                onChange={(event) => setReflection(event.target.value)}
                minLength={3}
                maxLength={500}
                rows={5}
                placeholder="I spent 20 minutes building the first version and sent it to..."
                autoFocus
                required
              />
            </label>

            <fieldset className="field">
              <legend>ENERGY AFTER THE ACTION</legend>
              <div className="energy-scale">
                {([1, 2, 3, 4, 5] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={energy === value ? "active" : ""}
                    onClick={() => setEnergy(value)}
                    aria-label={`Energy ${value} out of 5`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </fieldset>

            {error && <p className="form-error">{error}</p>}
            <button
              type="submit"
              className="primary-action primary-action--full portal-submit"
              disabled={busy}
            >
              {busy
                ? "Mutating the causal graph…"
                : pendingNexusEvidence
                  ? "Transmit Nexus evidence"
                  : "Transmit evidence"}
              <span className="primary-action__disc">
                {busy ? "◌" : "↗"}
              </span>
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
