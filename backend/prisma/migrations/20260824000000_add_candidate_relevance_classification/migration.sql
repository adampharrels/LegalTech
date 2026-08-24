ALTER TABLE "CaseCandidate" ADD COLUMN "aiRelevant" BOOLEAN;
ALTER TABLE "CaseCandidate" ADD COLUMN "relevanceScore" REAL;
ALTER TABLE "CaseCandidate" ADD COLUMN "relevanceReason" TEXT;
ALTER TABLE "CaseCandidate" ADD COLUMN "aiRole" TEXT;
