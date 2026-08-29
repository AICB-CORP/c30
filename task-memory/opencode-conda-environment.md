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

### DP3 — docs need an LLM key, code does not

- **choice**: code graphs build fully local (`--code-only --no-cluster`, no key); **markdown/docs graphs require an LLM API key** for semantic extraction.
- **rationale**: Graphify's doc/paper/image parsing is LLM-backed. Without `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` etc., `graphify extract task-memory` aborts with "no LLM API key found."
- **tradeoff**: the reasoning graph (our `task-memory/*.md`) cannot be auto-built until a key is provided; the code graph is available immediately.

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

# Build the REASONING graph from task-memory (needs an LLM API key)
conda run -n opencode graphify extract task-memory --out .

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
- `extract` on doc-only corpora errors without an LLM key. Use `--code-only` for a key-free build.
- `tree_sitter_sql` is missing (warning for `.sql` files) — harmless for our use; install `graphifyy[sql]` only if DB schema graphing is wanted.
- The OpenCode `graphify opencode install` command rewrites `AGENTS.md` — we did NOT use it (to avoid clobbering the custom pipeline); instead the skill lives at `.opencode/skills/graphify/SKILL.md` and the query step is wired manually into the project-manager pipeline.

## Lessons for future agents

- Always run Graphify commands with `conda run -n opencode …` (or after `conda activate opencode`).
- Keep `graphify-out/` gitignored; never commit the generated graph.
- To enrich the memory graph with new task reasoning, an LLM key must be exported in the shell first.

## Linked reasoning / similar tasks

- [invites-multiuse](./2026-08-28-invites-multiuse.md) — first task captured in this memory system.
- [user-creation-model](./2026-08-28-user-creation-model.md) — auth reference captured alongside it.
- The project-manager pipeline (`.opencode/agent/project-manager.md`) step 1 queries this graph; step 7 extends it.
