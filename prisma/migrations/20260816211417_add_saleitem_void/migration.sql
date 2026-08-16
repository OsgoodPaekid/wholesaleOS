-- AlterTable
ALTER TABLE "SaleItem" ADD COLUMN     "voidedAt" TIMESTAMP(3),
ADD COLUMN     "voidedById" TEXT;
