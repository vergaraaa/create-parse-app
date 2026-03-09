#!/usr/bin/env node

/**
 * create-parse-app
 * ─────────────────
 * Scaffolds a new Parse Server project from the template repo.
 *
 * Usage:
 *   npx @vergaraaa/create-parse-app <project-name>
 *   npx @vergaraaa/create-parse-app          ← prompts for name
 */

const readline = require("readline");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// ─── Config ───────────────────────────────────────────────────────────────────
const TEMPLATE_REPO = "https://github.com/vergaraaa/parse-server-template.git";
// Files that belong to the template meta — not the app itself
const FILES_TO_REMOVE = ["setup.js", "wiki.md", ".git"];

// ─── ANSI Colors ──────────────────────────────────────────────────────────────
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
};

const log = {
  info: (msg) => console.log(`${c.blue}ℹ${c.reset}  ${msg}`),
  success: (msg) => console.log(`${c.green}✔${c.reset}  ${msg}`),
  warn: (msg) => console.log(`${c.yellow}⚠${c.reset}  ${msg}`),
  error: (msg) => console.log(`${c.red}✖${c.reset}  ${msg}`),
  step: (n, msg) => console.log(`\n${c.bold}${c.cyan}[${n}]${c.reset} ${c.bold}${msg}${c.reset}`),
  divider: () => console.log(`${c.dim}${"─".repeat(50)}${c.reset}`),
  blank: () => console.log(),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question, defaultValue) {
  return new Promise((resolve) => {
    const hint = defaultValue ? ` ${c.dim}(${defaultValue})${c.reset}` : "";
    rl.question(`  ${c.bold}${question}${c.reset}${hint}: `, (answer) => {
      resolve(answer.trim() || defaultValue || "");
    });
  });
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// "my-app" → "My App"
function toDisplayName(slug) {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function run(cmd, cwd) {
  execSync(cmd, { cwd, stdio: "pipe" });
}

function rmrf(target) {
  if (!fs.existsSync(target)) return;
  fs.rmSync(target, { recursive: true, force: true });
}

function patchFile(filePath, patchFn, label) {
  if (!fs.existsSync(filePath)) {
    log.warn(`${label} not found — skipping.`);
    return;
  }
  const original = fs.readFileSync(filePath, "utf8");
  const patched = patchFn(original);
  if (patched === original) {
    log.warn(`${label} — no changes detected.`);
    return;
  }
  fs.writeFileSync(filePath, patched, "utf8");
  log.success(`Patched ${c.dim}${label}${c.reset}`);
}

// ─── Patchers ─────────────────────────────────────────────────────────────────

function patchDockerCompose(content, slug) {
  return content
    .replace(/^(\s*)mongodb(\s*:)/gm, `$1${slug}-mongodb$2`)
    .replace(/^(\s*)parse-app(\s*:)/gm, `$1${slug}-parse-app$2`)
    .replace(/container_name:\s*parse-mongodb/g, `container_name: ${slug}-parse-mongodb`)
    .replace(/container_name:\s*parse-express-app/g, `container_name: ${slug}-parse-express-app`)
    .replace(/(depends_on:\s*\n\s*-\s*)mongodb/g, `$1${slug}-mongodb`)
    .replace(/mongodb:\/\/mongodb:/g, `mongodb://${slug}-mongodb:`);
}

function patchEnv(content, slug, appName) {
  return content
    .replace(/DATABASE_URI=mongodb:\/\/mongodb:/g, `DATABASE_URI=mongodb://${slug}-mongodb:`)
    .replace(/APP_NAME=.*/g, `APP_NAME=${appName}`);
}

function patchPackageJson(content, slug) {
  try {
    const pkg = JSON.parse(content);
    pkg.name = slug;
    return JSON.stringify(pkg, null, 2) + "\n";
  } catch {
    return content.replace(/"name"\s*:\s*"[^"]*"/, `"name": "${slug}"`);
  }
}

function patchDeployScript(content, b4aAppName, b4aAppId, email) {
  return content
    .replace(/<YOUR_APP_NAME>/g, b4aAppName)
    .replace(/<YOUR_APP_ID>/g, b4aAppId)
    .replace(/<YOUR_EMAIL>/g, email)
    .replace(/npm run build/g, "pnpm run build");
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  // Banner
  log.blank();
  console.log(`${c.bold}${c.cyan}╔═══════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.bold}${c.cyan}║   create-parse-app  ·  by vergaraaa       ║${c.reset}`);
  console.log(`${c.bold}${c.cyan}╚═══════════════════════════════════════════╝${c.reset}`);
  log.blank();

  // ── Resolve project name ───────────────────────────────────────────────────
  let projectName = process.argv[2];

  if (!projectName) {
    projectName = await ask("Project name");
  }

  const slug = slugify(projectName);

  if (!slug) {
    log.error("Project name cannot be empty.");
    rl.close();
    process.exit(1);
  }

  const targetDir = path.resolve(process.cwd(), slug);

  if (fs.existsSync(targetDir)) {
    log.error(`Directory ${c.bold}${slug}${c.reset} already exists. Choose a different name.`);
    rl.close();
    process.exit(1);
  }

  // Auto-generate display name from slug — "my-app" → "My App"
  const appName = toDisplayName(slug);

  // ── Back4App details ───────────────────────────────────────────────────────
  log.blank();
  log.divider();
  console.log(`  ${c.dim}Find your App ID: Back4App Dashboard → Your App → Security & Keys${c.reset}`);
  log.blank();

  const b4aAppName = await ask("Back4App app name (exact name from dashboard)");
  const b4aAppId = await ask("Back4App App ID");
  const email = await ask("Back4App account email");
  log.blank();

  // ── Summary + confirm ──────────────────────────────────────────────────────
  log.divider();
  console.log(`  ${c.dim}Project folder:${c.reset}     ${c.bold}./${slug}${c.reset}`);
  console.log(`  ${c.dim}Docker prefix:${c.reset}      ${c.bold}${slug}-mongodb${c.reset}, ${c.bold}${slug}-parse-express-app${c.reset}`);
  console.log(`  ${c.dim}APP_NAME:${c.reset}           ${c.bold}${appName}${c.reset} ${c.dim}(auto-generated)${c.reset}`);
  if (b4aAppName) console.log(`  ${c.dim}Back4App name:${c.reset}     ${c.bold}${b4aAppName}${c.reset}`);
  if (b4aAppId) console.log(`  ${c.dim}Back4App App ID:${c.reset}    ${c.bold}${b4aAppId}${c.reset}`);
  if (email) console.log(`  ${c.dim}Back4App email:${c.reset}     ${c.bold}${email}${c.reset}`);
  log.blank();

  const confirm = await ask("Create project? (y/n)", "y");
  if (confirm.toLowerCase() !== "y") {
    log.warn("Aborted. Nothing was created.");
    rl.close();
    process.exit(0);
  }

  // ── Step 1: Clone ──────────────────────────────────────────────────────────
  log.step(1, "Cloning template…");
  try {
    run(`git clone --depth 1 ${TEMPLATE_REPO} ${slug}`, process.cwd());
    log.success("Template cloned.");
  } catch (err) {
    log.error(`Failed to clone template: ${err.message}`);
    log.error(`Repo: ${TEMPLATE_REPO}`);
    rl.close();
    process.exit(1);
  }

  // ── Step 2: Clean template meta-files ─────────────────────────────────────
  log.step(2, "Cleaning up template files…");
  for (const f of FILES_TO_REMOVE) {
    const target = path.join(targetDir, f);
    rmrf(target);
    log.success(`Removed ${c.dim}${f}${c.reset}`);
  }

  // ── Step 3: Patch files ────────────────────────────────────────────────────
  log.step(3, "Configuring project…");

  patchFile(
    path.join(targetDir, "docker-compose.yml"),
    (content) => patchDockerCompose(content, slug),
    "docker-compose.yml"
  );

  // Create .env from .env.example if it doesn't exist yet
  const envExample = path.join(targetDir, ".env.example");
  const envFile = path.join(targetDir, ".env");
  if (!fs.existsSync(envFile) && fs.existsSync(envExample)) {
    fs.copyFileSync(envExample, envFile);
    log.success(`Created ${c.dim}.env${c.reset} from .env.example`);
  }

  patchFile(
    envFile,
    (content) => patchEnv(content, slug, appName),
    ".env"
  );

  patchFile(
    path.join(targetDir, "package.json"),
    (content) => patchPackageJson(content, slug),
    "package.json"
  );

  if (b4aAppName && b4aAppId) {
    patchFile(
      path.join(targetDir, "deploy.sh"),
      (content) => patchDeployScript(content, b4aAppName, b4aAppId, email),
      "deploy.sh"
    );
  }

  // ── Step 4: Fresh git repo ─────────────────────────────────────────────────
  log.step(4, "Initialising fresh git repo…");
  run("git init", targetDir);
  run("git add -A", targetDir);
  run(`git commit -m "chore: scaffold ${slug} from parse-server-template"`, targetDir);
  log.success("Git repo initialised with initial commit.");

  // ── Done ───────────────────────────────────────────────────────────────────
  log.blank();
  console.log(`${c.bold}${c.green}🎉  ${slug} is ready!${c.reset}`);
  log.blank();
  console.log(`  Next steps:\n`);
  console.log(`  ${c.cyan}cd ${slug}${c.reset}`);
  console.log(`  ${c.cyan}docker compose up --build${c.reset}   ← first run`);
  console.log(`  ${c.cyan}docker compose up${c.reset}           ← subsequent runs`);
  log.blank();
  console.log(`  ${c.dim}When deploying: ./deploy.sh — then run dbMigrate from the Back4App API Console.${c.reset}`);
  log.blank();

  rl.close();
}

main().catch((err) => {
  log.error(`Unexpected error: ${err.message}`);
  rl.close();
  process.exit(1);
});