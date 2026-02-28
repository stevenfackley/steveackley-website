-- CreateEnum
CREATE TYPE "Environment" AS ENUM ('PRODUCTION', 'TEST', 'DEVELOPMENT');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "contactFirstName" TEXT,
ADD COLUMN     "contactLastName" TEXT;

-- AlterTable
ALTER TABLE "ClientApp" ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "environment" "Environment" NOT NULL DEFAULT 'PRODUCTION',
ADD COLUMN     "productName" TEXT;
