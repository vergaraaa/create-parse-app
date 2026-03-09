# create-parse-app

Scaffold a new [Parse Server](https://parseplatform.org/) project from the Cyberneid template in seconds.

```bash
npx @cyberneid/create-parse-app my-new-app
```

Or without a name (the CLI will prompt you):

```bash
npx @cyberneid/create-parse-app
```

---

## What it does

1. **Clones** [`cyberneid/parse-server-template`](https://github.com/cyberneid/parse-server-template) into a new local folder
2. **Prompts** you for:
   - App display name (used as `APP_NAME` in `.env`)
   - Back4App app name (exact name from your dashboard)
   - Back4App App ID (from Security & Keys settings)
3. **Patches** your new project:
   - `docker-compose.yml` — renames all services and containers with your app prefix
   - `.env` — sets `APP_NAME` and the correct `DATABASE_URI` hostname
   - `package.json` — sets the `"name"` field
   - `deploy.sh` — replaces `<YOUR_APP_NAME>` and `<YOUR_APP_ID>` placeholders
4. **Removes** template-only files (`wiki.md`, `setup.js`)
5. **Initialises** a fresh git repo with an initial commit

---

## After scaffolding

```bash
cd my-new-app
docker compose up --build   # first run
docker compose up           # subsequent runs
```

When you're ready to deploy:
```bash
./deploy.sh
# Then run dbMigrate from the Back4App API Console
```

---

## Requirements

- Node.js 18+
- Git installed and available in PATH
- Docker (for local development)
