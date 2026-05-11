# Hex Empire

Turn-based 4X-lite game as a React PWA, optimized for the Samsung Galaxy Fold 5 inner screen (~7.6", ~882x2208 portrait).

Live build: https://pvaliuttto90.github.io/civ/

## Stack

- React + Vite
- Zustand for state
- SVG hex rendering (pointy-top, axial coords)
- No backend — everything in memory

## Run locally

```bash
npm install
npm run dev
```

## Deploy

Pushes to `main` or `claude/hex-empire-game-UR1ch` trigger the
`Deploy to GitHub Pages` workflow in `.github/workflows/deploy.yml`,
which builds with Vite and publishes `dist/` to Pages.

One-time setup in the repo:

1. Settings → Pages → *Build and deployment* → Source: **GitHub Actions**.
2. Re-run the workflow if it failed before Pages was enabled.
