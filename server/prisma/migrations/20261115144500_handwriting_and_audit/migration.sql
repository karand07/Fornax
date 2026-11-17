-- AlterTable
ALTER TABLE "Submission" ADD COLUMN "scanPath" TEXT,
ADD COLUMN "ocrOriginal" TEXT,
ADD COLUMN "ocrStatus" TEXT,
ADD COLUMN "ocrEditedBy" TEXT,
ADD COLUMN "ocrEditedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Grade" ADD COLUMN "gradedAt" TIMESTAMP(3),
ADD COLUMN "reviewedBy" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "overriddenBy" TEXT,
ADD COLUMN "overrideNote" TEXT,
ADD COLUMN "overriddenAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
