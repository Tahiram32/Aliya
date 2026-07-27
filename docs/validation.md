# Integration validation record

This log separates live Neural Pulse evidence from local contract checks. Keep
it current before recording the final demo.

## Live API checks

### 2026-07-26 — initial schema and structured database

- `create_schema` registered all six tables in the initial LivingDNA namespace.
- `insert_data` created a cognitive-twin root, future nodes, missions, and an
  anonymous product event.
- `select_data` retrieved the newly created twin and all three future nodes
  after writes were changed from parallel to ordered execution.
- A read-only inspection confirmed the documented row shape, including Neural
  Pulse's generated `_id` and `_created_at` fields.

The first concurrent-write trial returned only two of three sibling nodes.
That result is preserved as the reason all Virtual Database writes are now
serialized. Independent reads remain parallel.

### 2026-07-26 — AI gateway behavior

Benign `chat` requests, including the example copied from the official
documentation, were rejected with HTTP 400 and `Request blocked by security
policy`. Example trace IDs:

- `f309b5c5-d003-4a15-8d16-7c152a747be3` — official documentation example
- `bab1d166-7e67-47e8-9cc6-da9be22efd77` — minimal benign prompt

Aliya now retries the Neural Pulse AI action on each observation and uses a
bounded deterministic causal router only for this specific upstream policy
failure. Structured storage, retrieval, mutation, and telemetry never leave
Neural Pulse.

### 2026-07-27 — mutation boundary

- Live manifestation and graph reconstruction passed with three nodes.
- The first mutation attempt exposed the API's 2,000-character prompt limit.
- The mutation prompt was compacted and a maximum-input regression test now
  enforces that ceiling.
- The subsequent live mutation retry was not processed because the account
  reached its 50-request monthly Free-plan limit.

The full live mutation must therefore be repeated after the API key/account
allowance is refreshed. Do not describe that step as live-verified in the demo
until it passes.

### 2026-07-27 — temporal field expansion

Aliya's local contracts and preview engine now cover five new graph behaviors:
Reality Signatures, Nexus Move, Shadow Orbit, Temporal Rewind, and Borrowed
Light. The LivingDNA definition has expanded from six to eight tables, with
new columns on missions and identity signals.

The local checks verify that:

- three dated Reality Signatures attach to three different futures;
- a Nexus Move gives all three futures a positive change;
- the Shadow Orbit stays hidden until the third check-in;
- resolving a Reality Signature creates causal history for Temporal Rewind;
- Borrowed Light returns no suggestions before three distinct contributors;
- shared suggestions contain no visitor IDs or private reflections;
- both maximum-length AI prompts stay under 2,000 characters.

These behaviors have not yet been exercised against the live provider because
the current allowance remains exhausted. They must not be described as
live-verified until the revalidation checklist below passes.

## Automated and browser checks

- TypeScript strict check passes.
- Thirteen Vitest tests pass, including maximum prompt sizes, deterministic
  evidence routing, the delayed Shadow reveal, Reality Signature calibration,
  Nexus Move behavior, and the Borrowed Light privacy threshold.
- Next.js production build passes.
- Dependency audit reports zero known production vulnerabilities.
- Headless Chromium verifies the intake interaction, generated observatory,
  immediate `NEURAL PULSE / LINKED` status, and a 390-pixel viewport with no
  horizontal overflow.
- A new preview-mode browser journey resolves a Reality Signature, submits a
  Nexus Move, adds three evidence signals, opens the revealed Shadow Orbit, and
  renders Temporal Rewind plus the honestly locked Borrowed Light state. It
  completes with no browser errors and zero horizontal overflow at 390 pixels.

## Production deployment

On 2026-07-27, Aliya was deployed to
[`https://aliya-jet.vercel.app`](https://aliya-jet.vercel.app). Public
verification confirmed:

- HTTP 200 over TLS;
- `NEURAL PULSE / LINKED` in a production Chromium render;
- `/api/status` returning `mode: neural` with a server-side endpoint;
- the expected content, frame, referrer, permissions, and transport-security
  headers.

The eight-table `aliya_*` LivingDNA update still requires a one-time bootstrap
after the API allowance is refreshed. Until then, production intentionally
reports `schemaReady: false`.

## Revalidation checklist after key rotation

1. Put the rotated key in the local runtime environment.
2. Run `npm run neural:bootstrap` and confirm all eight tables are registered.
3. Create one fresh constellation through the UI.
4. Reload it from `/api/constellation`.
5. Resolve one Reality Signature and confirm its future changes by the stored
   causal delta.
6. Submit three evidence check-ins, using the Nexus Move for one, and confirm:
   - one identity signal was inserted;
   - all three node probabilities were updated;
   - three causal edges were inserted;
   - the selected mission state changed when proof was supplied;
   - the Nexus Move is marked complete;
   - the Shadow Orbit becomes selectable only after check-in three;
   - Temporal Rewind reconstructs the signal and all stored deltas;
   - the footer check-in count increased.
7. Use three distinct test visitors to complete native missions, then confirm
   Borrowed Light unlocks only catalog text and correct anonymous use counts.
8. Record the successful trace IDs and date in this document.
