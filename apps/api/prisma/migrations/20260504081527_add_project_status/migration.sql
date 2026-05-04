-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE';
