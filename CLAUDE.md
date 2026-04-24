# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

创新小学作业管理系统 — a responsive web app for primary school homework assignment and grading. Three user roles: student (答题), teacher (出题/批改), admin (系统管理). Full spec in `开发说明书.md`.

## Tech Stack

- **Backend**: Node.js + Express, better-sqlite3 (SQLite), JWT auth, bcryptjs
- **Frontend**: Vue 3 + Vite, Vant (mobile), Element Plus (desktop), Pinia, vue-router
- **AI Grading**: DeepSeek API integration via configurable provider
- **E2E Tests**: Playwright (in `tests/` directory, separate package)

## Common Commands

### Backend (from `backend/`)
```bash
npm run dev          # Start dev server with nodemon (port 3000)
npm start            # Start production server
npm run init-db      # Initialize/reset SQLite database with schema + sample data
npm test             # Run Jest tests
```

### Frontend (from `frontend/`)
```bash
npm run dev          # Vite dev server (port 5173, proxies /api to localhost:3000)
npm run build        # Production build to dist/
npm run preview      # Preview production build
npm run lint         # ESLint
```

### E2E Tests (from `tests/`)
```bash
npm test                     # Run all Playwright tests
npm run test:student         # Student role tests only
npm run test:teacher         # Teacher role tests only
npm run test:admin           # Admin role tests only
npm run test:api             # API tests only
npm run report               # View test report
```

### Deployment
```bash
bash deploy.sh               # Deploy to 192.168.3.74 (PM2 or nohup)
```

## Architecture

### Backend Structure (`backend/src/`)
- **app.js** — Express app entry, mounts all routes, initializes DB, starts grading queue
- **config/** — `index.js` (env-based config), `database.js` (SQLite connection singleton)
- **routes/** — One file per resource, maps HTTP verbs to controller methods
- **controllers/** — Business logic per resource. Largest: `studentExamController.js` (35K), `examController.js` (30K), `gradingController.js` (19K)
- **services/** — `aiService.js` (DeepSeek API calls + prompt templates), `gradingQueueService.js` (async grading queue with concurrency/retry), `loginService.js` (lockout tracking)
- **middlewares/** — `auth.js` (JWT verification + role check), `errorHandler.js`
- **utils/** — Password hashing, validation helpers
- **constants/** — Shared constants (default password, etc.)
- **scripts/initDatabase.js** — Schema creation + seed data. Auto-runs on app start via `require()` in app.js

### Frontend Structure (`frontend/src/`)
- **router/index.js** — Three route groups: `/student/*`, `/teacher/*`, `/admin/*`, each with Layout wrapper and route guard (auth + role + first-login redirect)
- **store/** — Pinia stores: `user.js` (auth state, token, role), `device.js` (responsive breakpoint)
- **api/** — Axios API modules
- **views/** — Three role-based directories (`student/`, `teacher/`, `admin/`), each with Layout.vue shell
- **composables/** — Vue composables for shared logic
- **components/** — Shared components (auto-imported via unplugin)
- Dual UI library: Vant for mobile, Element Plus for desktop — resolved via unplugin auto-import

### Key Architectural Patterns
- **Database**: Single SQLite file at `backend/database/homework.db`. Schema auto-initialized on startup. No ORM — raw SQL via better-sqlite3 prepared statements.
- **Auth**: JWT token in Authorization header. Three user types (student/teacher/admin) stored in separate tables with separate login flows. First-login forces password change.
- **AI Grading**: Async queue system — submissions enter `grading_queue` table, `gradingQueueService` processes with concurrency limits and retry. Choice questions are auto-graded; fill/subjective go through AI API.
- **Grading Config**: Per-task grading config via `grading_config` table (ai/manual/mixed mode, provider settings, prompt customization). Tasks reference config via `grading_config_id`.
- **Class System**: Classes stored in `classes` table with grade+class_name unique constraint. Teachers have `manage_classes` (JSON array) for access control.
- **Data Import**: Excel import via xlsx library for students, teachers, and questions. Templates in `backend/src/templates/`.

## Environment Setup

Copy `backend/.env.example` to `backend/.env`. Key variables:
- `JWT_SECRET` — required in production
- `AI_API_KEY` — needed for AI grading
- `DATABASE_PATH` — defaults to `database/homework.db`

## Default Test Accounts

| Role | Account | Password |
|------|---------|----------|
| Admin | admin | Admin@123456 |
| Teacher | T2026001 | 123456 |
| Student | 202601001 | 123456 |
