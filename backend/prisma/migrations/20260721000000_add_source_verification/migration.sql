ALTER TABLE "Source" ADD COLUMN "sourceConfidence" TEXT NOT NULL DEFAULT 'Unknown';
ALTER TABLE "Source" ADD COLUMN "verificationStatus" TEXT NOT NULL DEFAULT 'Unverified';
ALTER TABLE "Source" ADD COLUMN "lastCheckedAt" DATETIME;
ALTER TABLE "Source" ADD COLUMN "verifiedBy" TEXT;
ALTER TABLE "Source" ADD COLUMN "archivedUrl" TEXT;
ALTER TABLE "Source" ADD COLUMN "retrievalNotes" TEXT;

CREATE INDEX "Source_verificationStatus_lastCheckedAt_idx" ON "Source"("verificationStatus", "lastCheckedAt");
