---
task_id: deploy-vercel-domain
date: 2026-09-21
type: feat
area: deployment
tags: [vercel, github-actions, domain, ci-cd]
status: implemented
branch: feat/deploy-vercel-domain
related_files:
  - .github/workflows/deploy.yml
  - .opencode/agent/deployment.md
decisions: []
---

# Deploy to Vercel with custom domain caroline-30.fun

## Summary

Created GitHub Actions workflow for automatic Vercel deployment and configured custom domain `caroline-30.fun` on the existing Vercel project `c30`. The domain is verified but requires a successful production deployment to become accessible.

## Context / Problem

The Skyblog des 30 ans project needs:
1. Automatic CI/CD pipeline for Vercel deployments
2. Custom domain `caroline-30.fun` configured and accessible
3. Preview deployments on PRs, production deployment on merge to main

## Decision Points

| Choice | Rationale | Alternatives | Tradeoff |
|--------|-----------|--------------|----------|
| GitHub Actions with `amondnet/vercel-action` | Standard, well-maintained action for Vercel deployments | Vercel CLI, direct API | Requires GitHub secrets configuration |
| npm install instead of npm ci | Lock file was out of sync with package.json | Fix lock file locally | Less strict but works |
| Node.js 22 instead of 20 | Node 20 deprecated on GitHub Actions runners | Set ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION | Uses supported LTS version |

## Implementation Approach

1. **Created `.github/workflows/deploy.yml`** with two jobs:
   - `deploy-preview`: Runs on PR, deploys to Vercel preview (non-production)
   - `deploy-production`: Runs on push to main, deploys to Vercel production

2. **Domain configuration**: `caroline-30.fun` and `www.caroline-30.fun` already verified on Vercel project `c30`

3. **Vercel project settings**: SSO protection enabled (`all_except_custom_domains`) — custom domains bypass SSO

## Pitfalls & Environment

- **GitHub Actions secrets not configured**: VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID, and all Supabase/R2 environment variables need to be added to GitHub repository settings → Secrets and variables → Actions
- **Vercel project not linked to GitHub repo**: The project `c30` exists under `moiap13s-projects` scope but GitHub Actions deployment fails because the repo isn't linked. This requires either:
  - Linking the repo in Vercel dashboard, OR
  - Using a Vercel token with access to the correct team scope
- **npm lock file out of sync**: Fixed by changing `npm ci` to `npm install` in workflow
- **Node.js 20 deprecated**: Updated workflow to use Node.js 22 (LTS)

## Screenshots

All screenshots saved to `task-memory/screenshot/feat/deploy-vercel-domain/`:
- `custom-domain-404.png` — Desktop view of 404 on caroline-30.fun (no production deployment)
- `custom-domain-404-mobile.png` — Mobile view (375x667) of 404 on caroline-30.fun
- `www-subdomain-404.png` — Desktop view of 404 on www.caroline-30.fun

## Lessons for Future Agents

1. **Always configure GitHub secrets before expecting CI/CD to work** — The workflow is correct but needs VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID, and all app environment variables
2. **Vercel project must be linked to GitHub repo** — Either via Vercel dashboard or by using a token with correct team scope
3. **Custom domains bypass SSO protection** — The project has `ssoProtection: { enabled: true, deploymentType: "all_except_custom_domains" }` which is correct for this use case
4. **Use `npm install` over `npm ci` when lock file may drift** — Safer for CI environments where lock file might not be perfectly in sync

## Next Steps (for human reviewer)

1. Add GitHub repository secrets:
   - `VERCEL_TOKEN` — Vercel access token with project permissions
   - `VERCEL_ORG_ID` — Team/organization ID (from Vercel dashboard)
   - `VERCEL_PROJECT_ID` — Project ID (`prj_Sv00H80fHtwUPLyhMbJ9wgzkHYJn`)
   - All environment variables from `.env.example` / `.env.local`

2. Link GitHub repository to Vercel project in Vercel dashboard (Settings → Git → Connect Repository)

3. Trigger a new deployment (push to main or re-run workflow) to get production deployment on caroline-30.fun