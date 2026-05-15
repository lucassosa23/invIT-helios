-- AlterEnum
ALTER TYPE "RequestStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "internal_requests" ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "delivered_at" TIMESTAMP(3),
ADD COLUMN     "rejected_at" TIMESTAMP(3),
ADD COLUMN     "rejection_reason" TEXT;
