# Hybrid GitHub → Local opencode flow

GitHub Actions **detects** new issues and webhooks your machine; **all AI work runs locally** (Ollama stays reachable at `localhost`).

```
GitHub issue opened
   └─> Actions workflow (notify-new-issue.yml)
         └─> POST webhook (via tunnel) ──> agent-launcher.mjs (local, port 8787)
               └─> spawns: opencode run --agent project-manager "<issue>"
                     └─> Ollama models, project files, PROJECT_PLAN.md — all local
```

## Prerequisites

- The project must be a git repo pushed to GitHub, with Issues enabled (Settings → General → Features).
- `node` ≥ 18 on your machine.
- `opencode` CLI on your PATH.
- Ollama running with your models (used by opencode as provider, e.g. `ollama/<model>`).

## Setup

### 1. Tunnel (exposes the local webhook to GitHub)

Choose one:

- **cloudflared** (quick tunnel, new URL each start):
  ```sh
  cloudflared tunnel --url http://localhost:8787
  # copy the https://xxx.trycloudflare.com URL
  ```
- **ngrok** (free static domain, URL stays fixed):
  ```sh
  ngrok http --url=<your-static-domain> 8787
  ```

The URL is the `AGENT_WEBHOOK_URL` GitHub secret — if it changes on restart, update it (see step 3).

### 2. Launch the receiver

```sh
AGENT_SECRET=$(openssl rand -hex 16) node scripts/agent-launcher.mjs
```

Or via launchd/cron so it survives reboots. Logs: `logs/agent-launcher.log`.

Env options: `AGENT_PORT` (default 8787), `AGENT_NAME` (default `project-manager`), `AGENT_MODEL` (e.g. `ollama/qwen2.5-coder:14b`), `AUTO=0` to disable `--auto`.

### 3. GitHub secrets

```sh
gh secret set AGENT_WEBHOOK_URL --repo <owner>/<repo>    # the tunnel URL
gh secret set AGENT_WEBHOOK_SECRET --repo <owner>/<repo> # same value as AGENT_SECRET
```

Optional — auto-refresh the URL when the tunnel restarts (cloudflared example):

```sh
gh secret set AGENT_WEBHOOK_URL --repo <owner>/<repo> \
  --body "$(curl -s http://127.0.0.1:8787/health >/dev/null && echo placeholder)"
```

(For ngrok, query `http://127.0.0.1:4040/api/tunnels` and feed the public_url.)

### 4. Push the workflow

The `.github/workflows/notify-new-issue.yml` becomes active once pushed. Open an issue to test.

## How it works

- Workflow triggers on `issues: [opened]`, builds a minimal JSON payload with `jq`, POSTs it to `AGENT_WEBHOOK_URL` with header `X-Agent-Secret`.
- `agent-launcher.mjs` verifies the secret (timing-safe), then spawns a **detached** `opencode run --agent project-manager "<prompt>"` in the project dir — it keeps running even if you close the terminal, and logs to `logs/`.
- The `project-manager` agent (`.opencode/agent/project-manager.md`) reads PROJECT_PLAN.md, delegates to the specialist agents, verifies, and reports.

## Notes & tradeoffs

- **`--auto`**: the launcher auto-approves by default so unattended runs can edit files. Set `AUTO=0` if you want a human gate.
- **Machine offline** = no implementation until it's back (the webhook just 404s; nothing queues).
- The webhook is unauthenticated except the shared secret — keep `AGENT_SECRET` strong and the tunnel private.
- No queue: if multiple issues arrive, each spawns its own opencode session.
