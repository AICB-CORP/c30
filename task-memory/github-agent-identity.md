---
task_id: github-agent-identity
date: 2026-08-29
type: reference
area: tooling
tags: [github, identity, ssh, gh, aicb-lab, AICB-CORP, credentials]
status: active
branch: feat/graphify-integration
related_files:
  - .ssh/config
  - task-memory/opencode-conda-environment.md
decisions:
  - agent-github-account-aicb-lab
  - agent-org-aicb-corp
  - ssh-key-githubaicb
  - gh-logged-in-aicb-lab
---

# Reference: agent GitHub identity (persistent)

Reusable note so the agent's GitHub identity is never re-discovered each session.

## Identity

- **GitHub username**: `aicb-lab` — this is the coding-agent's own account.
- **Organization**: `AICB-CORP` (members: `moiap13` + `aicb-lab`). All personal collaboration projects live under this org (e.g. `AICB-CORP/c30`).
- **Project repo**: `AICB-CORP/c30` (git remote `origin` points here, SSH form `git@github.com:AICB-CORP/c30.git`).

## SSH

- **SSH key**: `~/.ssh/githubaicb` (private, perms 600; public `~/.ssh/githubaicb.pub`).
- Configured in `~/.ssh/config` as the **primary** identity for `github.com` (with a safe fallback to `id_rsa`/`id_ed25519` so the legacy `moiap13/c30` pushes keep working). Also exposed as a clean alias `github-aicb`.
- Verified: `ssh -T git@github.com` → `Hi aicb-lab! ...`.

## `gh` CLI

- **Already logged in** as `aicb-lab` (active account) with the organization fine-grained PAT. Token lives in the OS keyring — **do not duplicate the token value in any file**.
- A second account `moiap13` (the org/bot token) is also registered for switching when a task needs the organization context.
- Switch active account: `gh auth switch --user aicb-lab` (or `moiap13`). Per-command override: `GH_TOKEN=<tok> gh ...` (recommended for agents — least privilege, no global state).

## Fine-grained PAT prerequisites (gotcha, cost real time)

For `gh` (API) access to `AICB-CORP/c30`, the fine-grained PAT needed BOTH:

1. the account `aicb-lab` added as a **collaborator** on the repo, AND
2. the **PAT's own Repository access** set to _All repositories_ (or `AICB-CORP/c30` explicitly), AND
3. **Permissions → Pull requests → Read and write** (otherwise `gh pr create` fails with `Resource not accessible by personal access token (createPullRequest)`).

SSH pushes do NOT need the PAT (they use the SSH key), but `gh pr create` / `gh repo view` do.

## Open PRs (created 2026-08-29)

- `AICB-CORP/c30` PR #1 — `feat/graphify-integration` → `main`
- `AICB-CORP/c30` PR #2 — `feat/invites-multiuse` → `main`

(`feat/task-reasoning-memory` intentionally skipped — its change was cherry-picked into `graphify-integration`, so a separate PR would conflict.)
