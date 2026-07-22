ALTER TABLE "CaseCandidate" ADD COLUMN "sourceAdapterName" TEXT;
ALTER TABLE "CaseCandidate" ADD COLUMN "sourceCategory" TEXT NOT NULL DEFAULT 'Court';
ALTER TABLE "CaseCandidate" ADD COLUMN "extractionMethod" TEXT NOT NULL DEFAULT 'Manual';
ALTER TABLE "CaseCandidate" ADD COLUMN "matchedKeywords" TEXT;
ALTER TABLE "CaseCandidate" ADD COLUMN "llmScreeningStatus" TEXT NOT NULL DEFAULT 'Not screened';
ALTER TABLE "CaseCandidate" ADD COLUMN "llmScreeningReason" TEXT;
ALTER TABLE "CaseCandidate" ADD COLUMN "duplicateCheckResult" TEXT;
ALTER TABLE "CaseCandidate" ADD COLUMN "fetchedAt" DATETIME;

CREATE INDEX "CaseCandidate_sourceCategory_extractionMethod_idx" ON "CaseCandidate"("sourceCategory", "extractionMethod");
