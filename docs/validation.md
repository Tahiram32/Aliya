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

## Automated and browser checks

- TypeScript strict check passes.
- Seven Vitest tests pass, including maximum prompt size and deterministic
  evidence-routing behavior.
- Next.js production build passes.
- Dependency audit reports zero known production vulnerabilities.
- Headless Chromium verifies the intake interaction, generated observatory,
  immediate `NEURAL PULSE / LINKED` status, and a 390-pixel viewport with no
  horizontal overflow.

## Production deployment

On 2026-07-27, Aliya was deployed to
[`https://aliya-jet.vercel.app`](https://aliya-jet.vercel.app). Public
verification confirmed:

- HTTP 200 over TLS;
- `NEURAL PULSE / LINKED` in a production Chromium render;
- `/api/status` returning `mode: neural` with a server-side endpoint;
- the expected content, frame, referrer, permissions, and transport-security
  headers.

The renamed `aliya_*` LivingDNA tables still require a one-time bootstrap after
the API allowance is refreshed. Until then, production intentionally reports
`schemaReady: false`.

## Revalidation checklist after key rotation

1. Put the rotated key in the local runtime environment.
2. Run `npm run neural:bootstrap` if the new account does not share the
   existing LivingDNA state.
3. Create one fresh constellation through the UI.
4. Reload it from `/api/constellation`.
5. Submit one evidence check-in and confirm:
   - one identity signal was inserted;
   - all three node probabilities were updated;
   - three causal edges were inserted;
   - the selected mission state changed when proof was supplied;
   - the footer check-in count increased.
6. Record the successful trace ID and date in this document.
