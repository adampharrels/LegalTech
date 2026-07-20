-- Add first-class workflow/status fields while preserving the older columns for compatibility.
ALTER TABLE "Case" ADD COLUMN "caseLifecycleStatus" TEXT NOT NULL DEFAULT 'Active';
ALTER TABLE "Case" ADD COLUMN "reviewStatus" TEXT NOT NULL DEFAULT 'Unreviewed';
ALTER TABLE "Case" ADD COLUMN "aiRelevanceStatus" TEXT NOT NULL DEFAULT 'Unknown';
ALTER TABLE "Case" ADD COLUMN "materialityLevel" TEXT NOT NULL DEFAULT 'Low';
ALTER TABLE "Case" ADD COLUMN "materialityScoreValue" INTEGER NOT NULL DEFAULT 1;

-- Backfill from legacy public/internal statuses.
UPDATE "Case"
SET "caseLifecycleStatus" = CASE
    WHEN "statusPublic" IN ('Active', 'Closed', 'Settled', 'Dismissed', 'Published', 'Pending') THEN "statusPublic"
    ELSE 'Pending'
END;

UPDATE "Case"
SET "reviewStatus" = CASE
    WHEN "statusInternal" = 'Human reviewed' THEN 'Human reviewed'
    WHEN "statusInternal" = 'LLM reviewed' THEN 'LLM analysed'
    WHEN "statusInternal" = 'Needs review' THEN 'Needs review'
    ELSE 'Unreviewed'
END;

UPDATE "Case"
SET "aiRelevanceStatus" = CASE
    WHEN "statusInternal" IN ('Human reviewed', 'LLM reviewed') AND "isAiRelated" = 1 THEN 'Relevant'
    WHEN "statusInternal" IN ('Human reviewed', 'LLM reviewed') AND "isAiRelated" = 0 THEN 'Not relevant'
    ELSE 'Unknown'
END;

UPDATE "Case"
SET "materialityLevel" = CASE
    WHEN "materialityScore" IN ('High', 'Medium', 'Low') THEN "materialityScore"
    WHEN CAST("materialityScore" AS INTEGER) >= 7 THEN 'High'
    WHEN CAST("materialityScore" AS INTEGER) >= 4 THEN 'Medium'
    ELSE 'Low'
END;

UPDATE "Case"
SET "materialityScoreValue" = CASE
    WHEN "materialityScore" = 'High' THEN 8
    WHEN "materialityScore" = 'Medium' THEN 5
    WHEN "materialityScore" = 'Low' THEN 2
    WHEN CAST("materialityScore" AS INTEGER) BETWEEN 1 AND 10 THEN CAST("materialityScore" AS INTEGER)
    ELSE 1
END;

-- Add human review metadata that the schema expects for saved LLM analyses.
ALTER TABLE "LlmAnalysis" ADD COLUMN "humanDecision" TEXT;
ALTER TABLE "LlmAnalysis" ADD COLUMN "reviewerName" TEXT;
ALTER TABLE "LlmAnalysis" ADD COLUMN "reviewerNotes" TEXT;
ALTER TABLE "LlmAnalysis" ADD COLUMN "reviewedAt" DATETIME;
