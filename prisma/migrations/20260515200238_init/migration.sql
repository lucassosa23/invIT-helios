-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'OPERATOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('HEALTHY', 'LOW', 'CRITICAL', 'OUT');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('IN', 'OUT', 'ADJUST', 'RECEIVE', 'CORRECTION');

-- CreateEnum
CREATE TYPE "MovementSourceKind" AS ENUM ('SCAN_SESSION', 'ORDER_RECEIVE', 'REQUEST_DELIVER', 'MANUAL_EDIT', 'IMPORT', 'AUDIT');

-- CreateEnum
CREATE TYPE "ScanSessionKind" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "ScanSessionStatus" AS ENUM ('OPEN', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'READY', 'ORDERED', 'PARTIAL', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'AWAITING_PURCHASE', 'READY_TO_DELIVER', 'DELIVERED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'ADMIN',
    "auth_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "rating" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "threshold" INTEGER NOT NULL DEFAULT 5,
    "unit_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "location_id" TEXT,
    "vendor_id" TEXT,
    "warranty_expires_at" TIMESTAMP(3),
    "status" "AssetStatus" NOT NULL DEFAULT 'HEALTHY',
    "dismissed_from_auto_plan" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movements" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "type" "MovementType" NOT NULL,
    "qty" INTEGER NOT NULL,
    "delta" INTEGER NOT NULL,
    "source_kind" "MovementSourceKind" NOT NULL,
    "source_ref" TEXT,
    "actor_id" TEXT,
    "note" TEXT,
    "prev_stock" INTEGER NOT NULL,
    "next_stock" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scan_sessions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "ScanSessionKind" NOT NULL,
    "status" "ScanSessionStatus" NOT NULL DEFAULT 'OPEN',
    "actor_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),

    CONSTRAINT "scan_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scan_lines" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "barcode" TEXT,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "last_scan_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scan_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unknown_scans" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "first_scan_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "resolved_to_asset_id" TEXT,

    CONSTRAINT "unknown_scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "note" TEXT,
    "month_year" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_lines" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "asset_id" TEXT,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "is_new" BOOLEAN NOT NULL DEFAULT false,
    "qty" INTEGER NOT NULL,
    "received_qty" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_requests" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "requester_name" TEXT NOT NULL,
    "requester_team" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "asset_id" TEXT,
    "brand" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "reason" TEXT NOT NULL DEFAULT '',
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "linked_order_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "internal_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_reports_sent" (
    "id" TEXT NOT NULL,
    "month_year" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_by_id" TEXT,

    CONSTRAINT "monthly_reports_sent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "note" TEXT,
    "actor_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_auth_id_key" ON "users"("auth_id");

-- CreateIndex
CREATE UNIQUE INDEX "assets_sku_key" ON "assets"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "assets_barcode_key" ON "assets"("barcode");

-- CreateIndex
CREATE INDEX "assets_status_idx" ON "assets"("status");

-- CreateIndex
CREATE INDEX "assets_category_idx" ON "assets"("category");

-- CreateIndex
CREATE INDEX "assets_barcode_idx" ON "assets"("barcode");

-- CreateIndex
CREATE INDEX "movements_asset_id_created_at_idx" ON "movements"("asset_id", "created_at");

-- CreateIndex
CREATE INDEX "movements_source_kind_source_ref_idx" ON "movements"("source_kind", "source_ref");

-- CreateIndex
CREATE INDEX "scan_sessions_status_idx" ON "scan_sessions"("status");

-- CreateIndex
CREATE INDEX "scan_sessions_actor_id_status_idx" ON "scan_sessions"("actor_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "scan_lines_session_id_asset_id_key" ON "scan_lines"("session_id", "asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "unknown_scans_session_id_barcode_key" ON "unknown_scans"("session_id", "barcode");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_reference_key" ON "purchase_orders"("reference");

-- CreateIndex
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders"("status");

-- CreateIndex
CREATE INDEX "purchase_orders_month_year_idx" ON "purchase_orders"("month_year");

-- CreateIndex
CREATE INDEX "order_lines_order_id_idx" ON "order_lines"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "internal_requests_reference_key" ON "internal_requests"("reference");

-- CreateIndex
CREATE INDEX "internal_requests_status_idx" ON "internal_requests"("status");

-- CreateIndex
CREATE INDEX "internal_requests_priority_idx" ON "internal_requests"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_reports_sent_month_year_key" ON "monthly_reports_sent"("month_year");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movements" ADD CONSTRAINT "movements_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movements" ADD CONSTRAINT "movements_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_sessions" ADD CONSTRAINT "scan_sessions_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_lines" ADD CONSTRAINT "scan_lines_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "scan_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_lines" ADD CONSTRAINT "scan_lines_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unknown_scans" ADD CONSTRAINT "unknown_scans_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "scan_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unknown_scans" ADD CONSTRAINT "unknown_scans_resolved_to_asset_id_fkey" FOREIGN KEY ("resolved_to_asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_requests" ADD CONSTRAINT "internal_requests_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_requests" ADD CONSTRAINT "internal_requests_linked_order_id_fkey" FOREIGN KEY ("linked_order_id") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
