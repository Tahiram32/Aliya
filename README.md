# Aliya

### Meet the person your next decision creates.

[Open Aliya](https://aliya-jet.vercel.app) ·
[View the repository](https://github.com/Tahiram32/Aliya)

Aliya started with a question: what if a future-self tool paid attention to
what you actually did instead of giving you another checklist?

You describe something you want to become, what keeps getting in the way, and
how much time you honestly have. Aliya turns that into three possible futures.
Each one has its own momentum, risks, and first move. When you return with
evidence from real life, the map changes.

It is not a fortune teller. The futures are possibilities you can test.

## How it works

1. **Describe the change.** Share a goal, your energy pattern, and the friction
   you keep running into.
2. **See three futures.** Aliya builds three different paths instead of forcing
   one ideal answer.
3. **Make one move.** Each path includes a small mission that can produce real,
   observable evidence.
4. **Come back with proof.** A check-in shifts the possibility field and
   creates the next mission.

Most productivity tools store tasks. Aliya stores a changing model of who your
actions are helping you become.

## Where Neural Pulse fits

Evorozen Neural Pulse is Aliya's backend, not an extra chat box. There is no
separate SQL, Supabase, Firebase, or vector database holding the real product
state.

Aliya keeps six connected record types in Neural Pulse LivingDNA:

| Record | What it remembers |
| --- | --- |
| `aliya_twins` | The goal, constraints, and current direction |
| `aliya_future_nodes` | Three possible selves and their changing signals |
| `aliya_missions` | Small actions and their completion state |
| `aliya_identity_signals` | Evidence submitted during check-ins |
| `aliya_causal_edges` | Why a piece of evidence changed each future |
| `aliya_product_events` | Anonymous usage counts for the live demo |

A check-in follows this path:

```text
new evidence
    → retrieve the existing cognitive graph
    → reason over the three futures
    → save the evidence and its causal links
    → update each future
    → create the next mission
```

All of those records are created, read, and updated through:

```text
POST https://pulse.evorozen.com/api/neural
```

The app uses the actions described in the
[Neural Pulse documentation](https://pulse.evorozen.com/docs):
`create_schema`, `insert_data`, `select_data`, `update_data`, and `chat`.
Independent reads happen together; writes happen in order because live testing
showed that simultaneous writes could drop a sibling record.

The detailed request flow is in
[`docs/neural-architecture.md`](docs/neural-architecture.md). Live integration
results and known provider limits are recorded in
[`docs/validation.md`](docs/validation.md).

## Run it locally

You will need Node.js 20.9 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Without a Neural Pulse key, the interface runs in a clearly marked preview
mode. The map still works, but it does not save anything.

### Connect Neural Pulse

Add your Neural Pulse settings to `.env.local`:

```bash
EVOROZEN_API_KEY=evo_live_your_key_here
EVOROZEN_API_URL=https://pulse.evorozen.com/api/neural
EVOROZEN_SCHEMA_READY=false
```

Register Aliya's LivingDNA tables once:

```bash
npm run neural:bootstrap
```

After the bootstrap succeeds, change `EVOROZEN_SCHEMA_READY` to `true` and
restart the app.

## Deploy it

Aliya is a Next.js app and can be deployed directly to Vercel. Add the same
three Neural Pulse variables to the Production and Preview environments. Run
the bootstrap once before setting `EVOROZEN_SCHEMA_READY=true`.

The live deployment is
[`aliya-jet.vercel.app`](https://aliya-jet.vercel.app).

## Useful commands

```bash
npm run dev        # start the local app
npm run typecheck  # check TypeScript
npm test           # run the test suite
npm run build      # create a production build
npm run check      # run every project check
```

## API routes

| Route | What it does |
| --- | --- |
| `GET /api/status` | Shows whether Neural Pulse is connected |
| `POST /api/manifest` | Creates the first possible-self map |
| `GET /api/constellation` | Rebuilds a saved map from Neural Pulse |
| `POST /api/check-in` | Adds evidence and changes the futures |
| `GET /api/metrics` | Reads anonymous usage totals |

## Project guide

```text
app/api/                  server routes
components/               observatory interface
lib/neural-pulse.ts       Neural Pulse requests and graph operations
lib/schema-bootstrap.ts   LivingDNA table definitions
lib/demo-engine.ts        non-persistent preview
scripts/                  one-time schema bootstrap
tests/                    contract and behavior tests
docs/                     architecture, validation, launch, and demo notes
```

## Buildathon notes

Aliya was started on July 27, 2026 for the Evorozen Apex: NextGen AI
Buildathon. The repository has no commits before the competition's July 17
start boundary.

- The build journey and launch checklist are in
  [`docs/launch-plan.md`](docs/launch-plan.md).
- The three-minute demo outline is in
  [`docs/demo-script.md`](docs/demo-script.md).
- Anonymous traction comes from Neural Pulse records exposed through
  `/api/metrics`.

## A small but important boundary

Aliya is an educational reflection tool. Its percentages are visual signals,
not scientific predictions. It is not a medical or mental-health service.

## License

MIT — see [`LICENSE`](LICENSE).
