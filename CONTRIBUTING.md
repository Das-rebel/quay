# Contributing to Quay

Thank you for your interest in contributing to Quay.

## Development Setup

```bash
git clone https://github.com/Das-rebel/quay.git
cd quay
bun install
bun run scripts/seed.ts   # seed the database
bun run src/server/index.ts  # start API server
npm run dev               # start dashboard (separate terminal)
```

## Running Tests

```bash
bash scripts/test-quay.sh
```

All PRs must pass the test suite. Run it before opening a PR.

## Code Style

- TypeScript strict mode is enforced
- Run `npm run check` before committing
- Use `bun` for all package management

## Submitting Changes

1. Fork and create a branch: `feat/your-feature` or `fix/your-bug`
2. Add tests for new functionality
3. Ensure `bash scripts/test-quay.sh` passes
4. Open a PR with a clear description of what changed and why

## Reporting Bugs

Open an issue with:
- Quay version (from `package.json`)
- Steps to reproduce
- Expected vs actual behavior
- Full error output

## Discussing Ideas

Open an issue first for significant changes — avoid major PRs without prior discussion.
