-- CreateTable
CREATE TABLE "LifecycleStage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "parentId" TEXT,
    "status" TEXT NOT NULL,
    "stageDate" DATETIME NOT NULL,
    "notes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'Manual',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LifecycleStage_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LifecycleStage_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "LifecycleStage" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "LifecycleStage_caseId_idx" ON "LifecycleStage"("caseId");
