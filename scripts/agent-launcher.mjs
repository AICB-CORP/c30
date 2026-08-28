#!/usr/bin/env node
// Local webhook receiver for the hybrid GitHub workflow.
//
// Flow: GitHub Actions fires on new issues -> POSTs to this server (via a
// tunnel like cloudflared/ngrok) -> we verify the shared secret -> spawn
// `opencode run` locally (Ollama models reachable at localhost) to implement
// the issue.
//
// Env vars:
//   AGENT_PORT      port to listen on (default 8787)
//   AGENT_SECRET    shared secret, must match GitHub secret AGENT_WEBHOOK_SECRET
//   PROJECT_DIR     project directory to run opencode in (default: cwd)
//   AGENT_NAME      opencode agent to run (default: project-manager)
//   AGENT_MODEL     optional model, e.g. ollama/qwen2.5-coder:14b
//   AUTO            "1" = pass --auto to opencode (auto-approve edits), default 1
//
// Endpoints:
//   GET  /health   tunnel sanity check
//   POST /         webhook receiver (validates X-Agent-Secret)

import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { appendFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { timingSafeEqual } from "node:crypto";

const PORT = Number(process.env.AGENT_PORT || 8787);
const SECRET = process.env.AGENT_SECRET || "";
const PROJECT_DIR = resolve(process.env.PROJECT_DIR || process.cwd());
const AGENT = process.env.AGENT_NAME || "project-manager";
const MODEL = process.env.AGENT_MODEL || "";
const AUTO = (process.env.AUTO ?? "1") === "1";
const LOG_DIR = join(PROJECT_DIR, "logs");
const LOG_FILE = join(LOG_DIR, "agent-launcher.log");
mkdirSync(LOG_DIR, { recursive: true });

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  appendFileSync(LOG_FILE, line);
  process.stdout.write(line);
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function startAgent(payload) {
  const issue = payload.issue;
  const body = (issue.body || "").slice(0, 2000);
  const prompt =
    `New GitHub issue #${issue.number} opened: "${issue.title}"\n` +
    `${issue.html_url}\n\n` +
    `Issue body:\n${body}\n\n` +
    `Read PROJECT_PLAN.md first. Analyze the issue, break it down, ` +
    `implement it using the project's agents and skills, verify your work ` +
    `(lint/typecheck), and report what you did.`;

  const args = ["run"];
  if (MODEL) args.push("--model", MODEL);
  args.push("--agent", AGENT, "--dir", PROJECT_DIR);
  if (AUTO) args.push("--auto");
  args.push(prompt);

  log(`spawning opencode: opencode ${args.join(" ")}`);
  const child = spawn("opencode", args, { detached: true, stdio: "ignore" });
  child.unref();
}

const server = createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }
  if (req.method !== "POST") {
    res.writeHead(405).end("method not allowed");
    return;
  }
  const secret = req.headers["x-agent-secret"] || "";
  if (!SECRET || !safeEqual(secret, SECRET)) {
    log(`rejected request: bad secret`);
    res.writeHead(401).end("unauthorized");
    return;
  }
  let raw = "";
  req.on("data", (chunk) => (raw += chunk));
  req.on("end", () => {
    try {
      const payload = JSON.parse(raw);
      if (payload.action !== "opened" || !payload.issue?.number) {
        log(`ignored payload: action=${payload.action}`);
        res.writeHead(400).end("bad payload");
        return;
      }
      log(`received issue #${payload.issue.number}: ${payload.issue.title}`);
      startAgent(payload);
      res.writeHead(202).end("accepted");
    } catch (err) {
      log(`bad JSON: ${err.message}`);
      res.writeHead(400).end("bad json");
    }
  });
});

server.listen(PORT, () =>
  log(
    `agent-launcher listening on http://localhost:${PORT} (project: ${PROJECT_DIR}, agent: ${AGENT})`,
  ),
);
