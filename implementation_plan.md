# AI Litigation Navigator - Implementation Plan

This document outlines the technical design, data schema, and execution roadmap for the **AI Litigation Navigator**, a full-stack legal-tech platform designed to track and analyze AI-related court cases and tribunal decisions.

## Goal Description

To build a searchable case database and intelligence platform that tracks AI-related litigation across primary jurisdictions (US and Australia for the MVP). The platform will support faceted filtering by jurisdiction, issue type, legal area, and procedural status, providing structured summaries of why specific cases matter. This addresses the gap in public understanding of AI litigation by providing a carefully curated, broad, and structured view of disputes where AI is material.

## User Review Required

> [!IMPORTANT]
> **Database Choice for Local Development**
> You specified PostgreSQL for the database. To minimize friction and start development immediately without requiring a local Postgres server/Docker setup, I recommend using **SQLite** for the local development phase and MVP. SQLite works seamlessly with Prisma out of the box. We can easily swap to Vercel Postgres/Neon later by changing a single Prisma provider line.
> **Please respond with whether you are okay starting with SQLite locally, or if you prefer PostgreSQL (and if so, do you have it running locally already, or should we use Docker?).**

## Proposed Architecture and Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS & Vanilla CSS (for tailored elements like modern gradients/glassmorphism)
- **UI Components**: `shadcn/ui` and `lucide-react` for premium, responsive design.
- **Database ORM**: Prisma
- **Database**: SQLite (proposed for local MVP) or PostgreSQL
- **Design Philosophy**: High aesthetic value. We will avoid generic MVP looks. The app will feature a sleek setup (perhaps a dark mode default, subtle micro-animations, glassmorphism, and dynamic layout components) to communicate "premium legal intelligence tool".

---

## Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  // We can easily switch this to 'postgresql' and update the url if needed for production
  provider = "sqlite"
  url      = "file:./dev.db" 
}

model Case {
  id                String       @id @default(uuid())
  slug              String       @unique
  caseName          String
  neutralCitation   String?
  docketNumber      String?
  jurisdiction      String
  country           String
  courtName         String
  courtLevel        String
  statusPublic      String
  statusInternal    String
  materialityScore  String
  filingDate        DateTime?
  decisionDate      DateTime?
  lastUpdated       DateTime     @updatedAt  @default(now())
  summaryShort      String
  summaryLong       String?
  whyItMatters      String?
  outcome           String?
  isAiRelated       Boolean      @default(true)
  createdAt         DateTime     @default(now())

  parties           Party[]
  issues            CaseIssue[]
  legalAreas        CaseLegalArea[]
  events            Event[]
  sources           Source[]
  relatedTo         RelatedCase[] @relation("RelatedCasesForward")
  relatedFrom       RelatedCase[] @relation("RelatedCasesBackward")
}

model Party {
  id        String  @id @default(uuid())
  caseId    String
  name      String
  role      String  // claimant, respondent, etc.
  partyType String  // individual, company, etc.
  case      Case    @relation(fields: [caseId], references: [id], onDelete: Cascade)
}

model Issue {
  id    String       @id @default(uuid())
  name  String       @unique
  slug  String       @unique
  cases CaseIssue[]
}

model CaseIssue {
  caseId  String
  issueId String
  case    Case   @relation(fields: [caseId], references: [id], onDelete: Cascade)
  issue   Issue  @relation(fields: [issueId], references: [id], onDelete: Cascade)

  @@id([caseId, issueId])
}

model LegalArea {
  id    String           @id @default(uuid())
  name  String           @unique
  slug  String           @unique
  cases CaseLegalArea[]
}

model CaseLegalArea {
  caseId      String
  legalAreaId String
  case        Case      @relation(fields: [caseId], references: [id], onDelete: Cascade)
  legalArea   LegalArea @relation(fields: [legalAreaId], references: [id], onDelete: Cascade)

  @@id([caseId, legalAreaId])
}

model Event {
  id          String   @id @default(uuid())
  caseId      String
  eventDate   DateTime
  eventType   String
  title       String
  description String?
  sourceId    String?
  case        Case     @relation(fields: [caseId], references: [id], onDelete: Cascade)
}

model Source {
  id          String   @id @default(uuid())
  caseId      String
  sourceType  String
  title       String
  url         String
  publisher   String?
  publishedAt DateTime?
  isPrimary   Boolean  @default(false)
  notes       String?
  case        Case     @relation(fields: [caseId], references: [id], onDelete: Cascade)
}

model RelatedCase {
  id               String @id @default(uuid())
  caseId           String
  relatedCaseId    String
  relationshipType String

  case        Case @relation("RelatedCasesForward", fields: [caseId], references: [id], onDelete: Cascade)
  relatedCase Case @relation("RelatedCasesBackward", fields: [relatedCaseId], references: [id], onDelete: Cascade)
  
  @@unique([caseId, relatedCaseId])
}
```

---

## Seed Data & Taxonomy Structure

I'll provide an ingestion/seeding script (`prisma/seed.ts`) mapping perfectly to your list:

**Issue Tags**:
* Copyright / training data
* Privacy / data protection
* Defamation
* Employment / hiring
* Discrimination / bias
* Consumer protection
* Product liability
* Deepfakes / impersonation
* Fraud / deception
* Hallucinated citations / false authorities
* Automated decision-making
* Platform / content moderation
* Contract / licensing
* Competition / antitrust
* Evidence / admissibility of AI output

**Legal Areas**:
* Intellectual property
* Privacy law
* Employment law
* Consumer law
* Tort
* Contract
* Administrative law
* Anti-discrimination law
* Procedural law / legal ethics
* Constitutional / public law

---

## Phased Execution Roadmap (For Automated Execution)

**Phase 1: Project Setup & Foundation**
- Generate Next.js application with Tailwind CSS and TypeScript in `/Users/adam/LegalTech` directory.
- Initialize Prisma with chosen database.
- Create Prisma schema, run migrations, and write the seed script for taxonomies. Let's populate the database with your 15 Issue tags and 10 Legal Area classifications, and mock up 1-2 example cases (US/Aussie) just so the UI has structure.

**Phase 2: The Data Layer & API**
- Implement Server Actions / Route Handlers to fetch Cases, Issues, and Legal Areas with necessary join relations (Prisma `include`).
- Create a robust filtering logic server-side that accepts query params (`jurisdiction`, `status`, `issue`, `legalArea`).

**Phase 3: The Core UI Components (Premium Design)**
- Create global layout: Navigation bar, dark mode aesthetic setup, typography system.
- Build the `Case Explorer` page (`/cases`): Card or Table view integrating the Server Actions. Add interactive, responsive filter sidebars.
- Build the `Case Detail` page (`/cases/[slug]`): Comprehensive header, "Why this matters", event timeline component, sources list.
- Build the `Dashboard` (`/dashboard`): Visual charts showing cases by jurisdiction, status, etc., (using something like `recharts`).

**Phase 4: Admin Panel Extensibility**
- Create the basic UI for `/admin` routes.
- Implement server actions for Case creation, editing, mapping issues, and adding event timelines.

## Open Questions

1. **Database:** As highlighted in the User Review Required section, please confirm if starting with SQLite locally is acceptable.
2. **Framework Init:** Should I run `npx create-next-app@latest ./` inside `/Users/adam/LegalTech` to scaffold the app, or do you have a specific Next.js template you prefer?

## Verification Plan

- Run Prisma seed to insert initial data and run test queries.
- Build application locally (`npm run dev`) and visually inspect the home, case explorer, and case detail pages.
- Verify that filtering accurately limits the case list using URL search params.
- Check aesthetic guidelines checking for premium design elements.
