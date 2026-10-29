-- AlterEnum
ALTER TYPE "AttendanceStatus" ADD VALUE 'FLAGGED';

-- AlterTable
ALTER TABLE "AttendanceRecord" ADD COLUMN     "codeValid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "faceDistance" DOUBLE PRECISION,
ADD COLUMN     "integrityScore" DOUBLE PRECISION,
ADD COLUMN     "livenessPassed" BOOLEAN,
ADD COLUMN     "method" TEXT NOT NULL DEFAULT 'SELF',
ADD COLUMN     "networkOk" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reviewedBy" TEXT;

-- AlterTable
ALTER TABLE "ClassSession" ADD COLUMN     "windowEndsAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "allowedIpPrefixes" TEXT[] DEFAULT ARRAY[]::TEXT[];
