# PyLab Practice Notebook

Interactive Python & Data Science practice platform — 85 concepts, 406
HackerRank-style graded exercises, and two real kernels running in the browser:

- **Python kernel** (Pyodide / CPython-WASM) with numpy, pandas, matplotlib,
  seaborn and scikit-learn.
- **TensorFlow.js kernel** (vendored `tf.min.js`, CPU backend) — the deep-learning
  module is fully live: 17 concepts from tensors, layers and training loops
  through CNNs, RNNs / LSTMs / GRUs, embeddings & tokenization, attention and
  transformers, with 92 JavaScript exercises graded by the same harness that
  validated them offline.

## Local development

```bash
bun install
bun run dev        # http://localhost:3000
```

## Deploy to Cloudflare Workers

This project is pre-configured for
[@opennextjs/cloudflare](https://opennext.js.org/cloudflare) (OpenNext):

| File | Purpose |
| --- | --- |
| `wrangler.jsonc` | Worker config — name, main, assets, `nodejs_compat`, self-reference service binding |
| `open-next.config.ts` | OpenNext adapter config |
| `public/_headers` | Immutable caching for hashed static assets |

```bash
bun run deploy     # build + deploy to Cloudflare Workers
bun run preview    # production preview locally via workerd
```

### On Cloudflare Workers Builds (connected repo)

- **Build command:** `bun run build`
- **Deploy command:** `bun run deploy` (or `npx wrangler deploy` — it detects
  the OpenNext project and delegates automatically)

> **Important:** the `WORKER_SELF_REFERENCE` service binding in
> `wrangler.jsonc` must point at the **same name** as the `name` field (this
> Worker). A mismatch causes Cloudflare error `10143`
> (*"Service binding 'WORKER_SELF_REFERENCE' references Worker '…' which was
> not found"*). If you rename the Worker, update **both** values.

## Project layout

- `src/components/pylab/` — notebook editor, exercise grader UI, kernel badge, command palette
- `src/lib/kernel/` — Pyodide worker protocol + lifecycle manager
- `src/lib/content/` — content types, registry, and the full curriculum data (`data/*.json`)
- `public/pyodide-worker.js` — in-browser Python kernel worker
- `pylab-exercise-catalog.md` — offline inventory of all 314 exercises
