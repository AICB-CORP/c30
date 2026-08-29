---
task_id: opencode-conda-env
date: 2026-08-29
type: reference
area: tooling
tags: [conda, graphify, python, environment, knowledge-graph, memory]
status: active
branch: feat/graphify-integration
related_files:
  - .opencode/skills/graphify/SKILL.md
  - .opencode/agent/project-manager.md
  - .gitignore
decisions:
  - conda-env-opencode
  - graphify-pip-graphifyy
  - graphify-code-only-no-key
---

# Reference: `opencode` conda environment (Graphify)

Persistent note so the Graphify toolchain can be reused without re-discovering how it was set up.

## Summary

Graphify (knowledge-graph builder for agent memory) runs inside a dedicated conda env named **`opencode`** (Python 3.11) on this machine. The env is created with conda (Miniforge3 at `/Users/antonio/miniforge3`); Graphify is installed via pip as the `graphifyy` package (PyPI). The generated graph lives in `graphify-out/` (gitignored).

## Context / Problem

The agentic-memory loop needs Graphify, but it is a Python tool, not Node. A dedicated conda env keeps it isolated from the Next.js/Node project and from the many other conda envs on this machine.

## Decision Points

### DP1 — dedicated conda env named `opencode`

- **choice**: `conda create -n opencode python=3.11 -y` (separate from `base` and the other project envs).
- **rationale**: isolation; the name `opencode` signals "tooling used by the OpenCode agents."
- **alternatives**: venv / uv → rejected for consistency with the rest of the machine which uses conda.

### DP2 — install via `pip install graphifyy`

- **choice**: `pip install graphifyy` (PyPI package `graphifyy`, version 0.9.51 at setup time). The CLI is invoked as `graphify`.
- **rationale**: matches the Graphify docs PyPI link. NOTE: the published CLI (0.9.51) uses subcommands (`graphify extract <path>`, `graphify query …`); the skill doc's `graphify <path>` shorthand is from a newer docs version — use `graphify extract` here.
- **alternatives**: install from GitHub `git+https://github.com/Graphify-Labs/graphify` for the very latest → not done (0.9.51 is sufficient and stable).

### DP3 — docs need an LLM; a LOCAL Ollama model satisfies it (no external key)

- **choice**: code graphs build fully local (`--code-only --no-cluster`, no key). For **markdown/docs** semantic extraction, use a **local Ollama model** via `--backend ollama` — this needs NO external API key (OpenAI/Anthropic/etc.).
- **rationale**: Graphify's doc parsing is LLM-backed, but the Ollama backend points the OpenAI SDK at `http://localhost:11434/v1`. The machine (M1 Max, 64 GB) runs `Llama3.1:8B` comfortably. This keeps the reasoning graph build **$0 and fully offline**.
- **prereqs** (one-time): (1) Ollama installed + running (`ollama ps`); (2) a model pulled, e.g. `ollama pull Llama3.1:8B`; (3) the `openai` Python package in the `opencode` env (`conda run -n opencode pip install openai`) — Graphify's ollama backend imports it; (4) set `OLLAMA_API_KEY` to any non-empty value to suppress the warning (the corpus is still sent to localhost).
- **verified**: `OLLAMA_API_KEY=ollama conda run -n opencode graphify extract task-memory --backend ollama --model Llama3.1:8B --no-cluster` → 4 nodes / 4 edges, 0 $ cost. Merged into the code graph (335 nodes / 478 edges) and queryable.
- **tradeoff**: the 8B model produces a **file-level** reasoning graph (one node per markdown file, edges between related docs) rather than fine-grained entity nodes. Good enough for retrieval; bump to a 27B model if richer entity extraction is wanted.

### DP4 — unified graph = merge reasoning into code graph

- **choice**: `graphify extract . --backend ollama --model Llama3.1:8B --out .` rebuilds the WHOLE repo (code + docs) as one semantic graph. For incremental updates, build `task-memory` separately then `graphify merge-graphs`.
- **rationale**: a single `graphify-out/graph.json` is simpler to query from the pipeline. The repo root graph is what step-1/step-7 of the pipeline target.

## Environment details (reuse me)

```bash
# create (already done)
conda create -n opencode python=3.11 -y
conda run -n opencode pip install --upgrade pip
conda run -n opencode pip install graphifyy

# one-off run (preferred — does not mutate the shell)
conda run -n opencode graphify <subcommand>

# or activate interactively
conda activate opencode
graphify --help
```

## Graphify CLI quick reference (used by the pipeline)

```bash
# Build the CODE graph (no API key needed) — fast, local AST
conda run -n opencode graphify extract . --code-only --no-cluster --out .

# Build the REASONING graph from task-memory via LOCAL Ollama (no external key)
# prereqs: `conda run -n opencode pip install openai` + `ollama pull Llama3.1:8B` + ollama running
OLLAMA_API_KEY=ollama conda run -n opencode graphify extract task-memory \
  --backend ollama --model Llama3.1:8B --no-cluster --out .

# Build the FULL repo graph (code + docs) in one shot, locally
OLLAMA_API_KEY=ollama conda run -n opencode graphify extract . \
  --backend ollama --model Llama3.1:8B --out .

# Query the graph for related prior reasoning (local BFS, no key needed)
conda run -n opencode graphify query "<task summary>" --graph graphify-out/graph.json --budget 1500

# Other useful subcommands
conda run -n opencode graphify explain "<Node>"
conda run -n opencode graphify path "A" "B"
conda run -n opencode graphify god-nodes
```

- Output: `graphify-out/graph.json` (+ `manifest.json`, `cache/`). **This directory is gitignored.**
- Run extraction from the **repo root** so `graphify-out/` resolves correctly.

## Pitfalls & Environment

- `graphify <path>` (no subcommand) is NOT supported in 0.9.51 → use `graphify extract <path>`.
- `extract` on doc-only corpora needs an LLM; use **local Ollama** (`--backend ollama`, see DP3) to avoid any external key, or `--code-only` for a key-free code graph only.
- Ollama backend requires the `openai` package in the `opencode` env: `conda run -n opencode pip install openai`. Without it: "the 'openai' package is required for this backend".
- Set `OLLAMA_API_KEY=ollama` (any value) to silence the "no OLLAMA_API_KEY set" warning; the corpus still goes to localhost:11434.
- `tree_sitter_sql` is missing (warning for `.sql` files) — harmless for our use; install `graphifyy[sql]` only if DB schema graphing is wanted.
- The OpenCode `graphify opencode install` command rewrites `AGENTS.md` — we did NOT use it (to avoid clobbering the custom pipeline); instead the skill lives at `.opencode/skills/graphify/SKILL.md` and the query step is wired manually into the project-manager pipeline.

## Lessons for future agents

- Always run Graphify commands with `conda run -n opencode …` (or after `conda activate opencode`).
- Keep `graphify-out/` gitignored; never commit the generated graph.
- Build the reasoning graph with **local Ollama** (no external key, fully offline): see DP3. An external `OPENAI_API_KEY`/`ANTHROPIC_API_KEY` is only needed if you prefer a hosted model over Ollama.

## Linked reasoning / similar tasks

- [invites-multiuse](./2026-08-28-invites-multiuse.md) — first task captured in this memory system.
- [user-creation-model](./2026-08-28-user-creation-model.md) — auth reference captured alongside it.
- The project-manager pipeline (`.opencode/agent/project-manager.md`) step 1 queries this graph; step 7 extends it.
