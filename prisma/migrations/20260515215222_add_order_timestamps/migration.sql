-- AlterTable
ALTER TABLE "purchase_orders" ADD COLUMN     "ordered_at" TIMESTAMP(3),
ADD COLUMN     "received_at" TIMESTAMP(3);
