# Changelog

All notable changes to `@vergaraaa/create-parse-app` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.5] - 2026-07-27

### Changed

- README now documents `pnpm` usage: `pnpm dlx` / `pnpm create` invocation, the
  `pnpm i` install step, and a note that the generated project builds with `pnpm`.

### Fixed

- Typo in the `deploy.sh` bullet of the README ("abd" → "and").

## [1.0.4] - 2026-03-09

- Latest published release.

## [1.0.3]

- Maintenance release.

## [1.0.2]

- Maintenance release.

## [1.0.0]

- Initial public release: clones the Parse Server template, prompts for project
  and Back4App details, patches `docker-compose.yml` / `.env` / `package.json` /
  `deploy.sh`, and initialises a fresh git repo.
