# Developer Guide

This document is for maintainers and contributors working on ImageFlowIO.

## Prerequisites

- Node.js >= 18
- npm >= 8
- On Windows, prefer PowerShell or Git Bash for multi-command sequences.

## Build & Test

- Build: `npm run build`
- Run tests: `npx vitest run --reporter=dot`
- Windows tip: prefer `;` to chain commands in PowerShell (e.g., `npm run build; npx vitest run`).
- ESM/CJS outputs are built via `tsup` into `dist/`.

## Release Process (npm)

Releases are performed via GitHub Actions when a tag matching `v*` is pushed (see `.github/workflows/publish.yml`).

1. Ensure main is green

- Merge all changes to `main` and verify CI is green.

2. Bump version and create tag

- Use npm to bump version and create a Git tag that matches the workflow's filter:
  - Patch: `npm version patch -m "chore: release v%s"`
  - Minor: `npm version minor -m "chore: release v%s"`
  - Major: `npm version major -m "chore: release v%s"`

3. Push with tags

- Push the commit and tag:
  - `git push origin main --follow-tags`

4. GitHub Actions publish

- The `publish.yml` workflow runs on tag pushes matching `v*` and will:
  - Install deps, build, test
  - Publish to npm with `npm publish`

Requirements

- Set the `NPM_TOKEN` secret in the GitHub repository settings. Without it, `npm publish` will fail.

Manual triggers (optional)

- You can add manual dispatch by augmenting `publish.yml` with:
  ```yaml
  on:
    workflow_dispatch: {}
  ```

Notes

- To trigger publish manually without `npm version`, you can create a tag yourself:
  - `git tag -a vX.Y.Z -m "release vX.Y.Z"`
  - `git push origin vX.Y.Z`
- Make sure the tag version and `package.json` version are in sync.
- Dry run a publish locally with `npm publish --dry-run`.

## Cutting a pre-release (optional)

- Use pre-release tags if desired (e.g., `v0.1.0-rc.1`). Adjust workflow/tag filter if needed.

## Common issues

- Only CI ran, not publish: you pushed to a branch, but not a `v*` tag. Create and push the tag to trigger publish.
- Windows EPERM/Access denied in tests: CLI tests are hardened, but if your env blocks spawns, they skip gracefully. Use `;` instead of `&&` for chaining.
