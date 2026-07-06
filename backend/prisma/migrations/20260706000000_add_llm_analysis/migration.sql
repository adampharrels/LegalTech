-- CreateTable
CREATE TABLE "LlmAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "isAiRelated" BOOLEAN NOT NULL,
    "summaryShort" TEXT NOT NULL,
    "summaryLong" TEXT NOT NULL,
    "whyItMatters" TEXT NOT NULL,
    "issueSlugs" TEXT NOT NULL,
    "legalAreaSlugs" TEXT NOT NULL,
    "unmatchedIssues" TEXT,
    "unmatchedLegalAreas" TEXT,
    "rawResponseJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LlmAnalysis_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "LlmAnalysis_caseId_createdAt_idx" ON "LlmAnalysis"("caseId", "createdAt");
