<img width="1280" height="640" alt="TinkerHub Useless Projects" src="https://github.com/user-attachments/assets/892ccf47-6ce2-4b02-819b-c286a894c0a7" />

# Noolu Pidichaal Mathi 🎯

> **Vazhi ariyille? Noolu pidichaal mathi.**

## Basic Details

### Team Name

Team details pending final hackathon submission.

### Team Members

- Team lead: Midhun P M — institution details pending

### Project Description

Noolu Pidichaal Mathi turns a top-down idiyappam photograph into an absurdly
serious metro system. The application extracts visible noodle paths, creates a
deterministic graph, and presents it as NoolVerse: a navigable 3D transit
network with stations, routes, and tiny trains.

### The Problem (that doesn't exist)

Breakfast has no reliable public transport. A traveller stuck at Coconut
Junction cannot confidently reach Curry Sector before the chutney gets cold.

### The Solution (that nobody asked for)

Treat idiyappam strands as verified transit infrastructure. The system shows
what it detected, labels uncertain crossings honestly, calculates a route over
visible paths, and lets the visitor ride the Nool Express.

## Technical Details

### Technologies/Components Used

For Software:

- TypeScript, Python, SQL
- Next.js, FastAPI, PostgreSQL
- React Three Fiber, Drei, OpenCV, scikit-image, NetworkX, SQLAlchemy
- pnpm, uv, Vitest, pytest, Ruff, mypy, Docker Compose, Dokploy

For Hardware:

- No dedicated hardware; image processing runs on the server and NoolVerse runs
  in a WebGL-capable browser.

### Implementation

The current foundation provides a typed Next.js shell, a typed FastAPI service,
versioned metro graph validation, PostgreSQL persistence models, and automated
checks. Image extraction, routing, 3D rendering, and deployment are active
implementation milestones.

#### Installation

```bash
pnpm install
cd apps/api && uv sync
```

#### Run

```bash
# Terminal 0: starts PostgreSQL locally; data is retained in a named volume.
docker compose -f compose.dev.yml up -d postgres

# Terminal 1
pnpm --filter @noolu/web dev

# Terminal 2
cd apps/api
cp .env.example .env
# Change DATABASE_URL to use localhost when the API runs outside Compose.
# DATABASE_URL=postgresql+asyncpg://noolu:change-me@localhost:5432/noolu
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

#### Verify

```bash
pnpm --filter @noolu/web run check
pnpm --filter @noolu/web run test
cd apps/api && uv run ruff check app tests && uv run mypy && uv run pytest
```

To stop the local database without removing its data, run
`docker compose -f compose.dev.yml stop postgres`. Use
`docker compose -f compose.dev.yml down -v` only when deliberately discarding
local development data.

## Project Documentation

### Workflow

```mermaid
flowchart LR
    A[Idiyappam photo] --> B[FastAPI vision pipeline]
    B --> C[Versioned metro graph]
    C --> D[PostgreSQL and image volume]
    C --> E[Next.js and NoolVerse]
    E --> F[Route planner and train journey]
```

### Screenshots

Screenshots will be added after the interactive upload, route, and NoolVerse
milestones are complete. They will use real runtime captures and clearly label
any synthetic data.

## Project Demo

The demo video will be recorded after the complete upload-to-train journey is
implemented and verified.

## Team Contributions

- Midhun P M: product direction and implementation

---

Made with ❤️ at TinkerHub Useless Projects

![TinkerHub](https://img.shields.io/badge/TinkerHub-24?color=%23000000&link=https%3A%2F%2Fwww.tinkerhub.org%2F)
![Useless Projects](https://img.shields.io/badge/UselessProjects--26-26?link=https%3A%2F%2Ftinkerhub.org%2Fevents%2F1M8ORET9A1%2Fuseless-projects-3.0)
