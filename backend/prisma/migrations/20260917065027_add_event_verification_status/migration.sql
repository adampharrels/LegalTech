ALTER TABLE "Event" ADD COLUMN "verificationStatus" TEXT NOT NULL DEFAULT 'Unverified';
ALTER TABLE "Event" ADD COLUMN "suggestedLifecycleStatus" TEXT;

CREATE INDEX "Event_verificationStatus_idx" ON "Event"("verificationStatus");
