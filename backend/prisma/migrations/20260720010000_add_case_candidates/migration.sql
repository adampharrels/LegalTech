-- CreateTable
CREATE TABLE "CaseCandidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseName" TEXT NOT NULL,
    "neutralCitation" TEXT,
    "docketNumber" TEXT,
    "jurisdiction" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "courtName" TEXT NOT NULL,
    "courtLevel" TEXT NOT NULL,
    "candidateStatus" TEXT NOT NULL DEFAULT 'Ingested',
    "rejectionReason" TEXT,
    "reviewerNotes" TEXT,
    "sourceConfidence" TEXT NOT NULL DEFAULT 'Unknown',
    "sourceTitle" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sourcePublisher" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'Court record',
    "sourcePublishedAt" DATETIME,
    "aiRelevanceStatus" TEXT NOT NULL DEFAULT 'Unknown',
    "materialityLevel" TEXT NOT NULL DEFAULT 'Low',
    "summaryShort" TEXT,
    "summaryLong" TEXT,
    "discoveredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" DATETIME,
    "acceptedCaseId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "CaseCandidate_candidateStatus_discoveredAt_idx" ON "CaseCandidate"("candidateStatus", "discoveredAt");

-- CreateIndex
CREATE INDEX "CaseCandidate_sourceUrl_idx" ON "CaseCandidate"("sourceUrl");
