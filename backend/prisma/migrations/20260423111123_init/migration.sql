-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "caseName" TEXT NOT NULL,
    "neutralCitation" TEXT,
    "docketNumber" TEXT,
    "jurisdiction" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "courtName" TEXT NOT NULL,
    "courtLevel" TEXT NOT NULL,
    "statusPublic" TEXT NOT NULL,
    "statusInternal" TEXT NOT NULL,
    "materialityScore" TEXT NOT NULL,
    "filingDate" DATETIME,
    "decisionDate" DATETIME,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summaryShort" TEXT NOT NULL,
    "summaryLong" TEXT,
    "whyItMatters" TEXT,
    "outcome" TEXT,
    "isAiRelated" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Party" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "partyType" TEXT NOT NULL,
    CONSTRAINT "Party_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "CaseIssue" (
    "caseId" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,

    PRIMARY KEY ("caseId", "issueId"),
    CONSTRAINT "CaseIssue_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CaseIssue_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LegalArea" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "CaseLegalArea" (
    "caseId" TEXT NOT NULL,
    "legalAreaId" TEXT NOT NULL,

    PRIMARY KEY ("caseId", "legalAreaId"),
    CONSTRAINT "CaseLegalArea_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CaseLegalArea_legalAreaId_fkey" FOREIGN KEY ("legalAreaId") REFERENCES "LegalArea" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "eventDate" DATETIME NOT NULL,
    "eventType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sourceId" TEXT,
    CONSTRAINT "Event_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publisher" TEXT,
    "publishedAt" DATETIME,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    CONSTRAINT "Source_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RelatedCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "relatedCaseId" TEXT NOT NULL,
    "relationshipType" TEXT NOT NULL,
    CONSTRAINT "RelatedCase_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RelatedCase_relatedCaseId_fkey" FOREIGN KEY ("relatedCaseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Case_slug_key" ON "Case"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Issue_name_key" ON "Issue"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Issue_slug_key" ON "Issue"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "LegalArea_name_key" ON "LegalArea"("name");

-- CreateIndex
CREATE UNIQUE INDEX "LegalArea_slug_key" ON "LegalArea"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "RelatedCase_caseId_relatedCaseId_key" ON "RelatedCase"("caseId", "relatedCaseId");
