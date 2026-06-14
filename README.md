# AI Litigation Navigator

A full-stack legal intelligence platform designed to track and analyze AI-related court cases and tribunal decisions.

## Overview

The AI Litigation Navigator addresses the gap in public understanding of AI litigation by providing a carefully curated, broad, and structured view of disputes where AI is material. It supports faceted filtering by jurisdiction, issue type, legal area, and procedural status.

## Features

- **Searchable Case Database:** Track AI-related litigation across primary jurisdictions (US, Australia, etc.).
- **Faceted Filtering:** Filter by jurisdiction, issue type, legal area, and procedural status.
- **Structured Summaries:** Access carefully curated summaries of why specific cases matter.
- **Automated Ingestion:** Uses `rss-parser` to automatically fetch new cases from official court RSS feeds.
- **AI Processing Pipeline:** Integrates Gemini AI to automatically determine relevance, generate structured summaries, and map cases to the taxonomy.
- **Admin Panel:** Built-in UI to create new case entries and delete existing cases from the database.


## Tech Stack

This repository is structured as a monorepo containing:

### Frontend (`/frontend`)
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS & Vanilla CSS (modern gradients, glassmorphism)
- **UI Components:** `lucide-react` for premium, responsive design

### Backend (`/backend`)
- **Server:** Express.js
- **Language:** TypeScript
- **Database ORM:** Prisma
- **Database:** SQLite (default for local development, easily swappable to PostgreSQL)

## Quick Start

### Prerequisites
- Node.js
- npm

### Installation and Setup

1. **Navigate to the project root:**
   ```bash
   cd /Users/adam/LegalTech
   ```

2. **Run the setup script:**
   This will install dependencies for both the frontend and backend, run Prisma database migrations, and seed the initial data.
   ```bash
   npm run setup
   ```

### Running Locally

You can start the development servers using the provided `dev.sh` script or NPM commands.

To run both concurrently using the shell script:
```bash
npm run dev
```

**Manual Start:**

Terminal 1 (Backend):
```bash
npm run backend
# API server runs on http://localhost:3001
```

Terminal 2 (Frontend):
```bash
npm run frontend
# Next.js app available at http://localhost:3000
```

## Database Management

The project uses Prisma as its ORM. The following commands can be run from the root directory to interact with the backend database:

- `npm run db:migrate`: Run Prisma migrations to update the database schema.
- `npm run db:seed`: Seed the database with initial taxonomy (issues, legal areas) and case data.
- `npm run db:reset`: Reset the SQLite database and reseed it.
- `npm run db:studio`: Open Prisma Studio at `http://localhost:5555` to view and edit data visually.

## Project Structure

- `backend/`: Express API server, route handlers, and Prisma schema (`schema.prisma`), migrations, and seed scripts.
- `frontend/`: Next.js application (`src/app`), React components (`src/components`), Server Actions (`src/actions`), and styling.
- `DEVELOPMENT.md`: Detailed development guide, API testing instructions, and Git workflows.
- `implementation_plan.md`: Technical design, data schema, and phased execution roadmap.

## License

MIT License. See `package.json` for more details.
