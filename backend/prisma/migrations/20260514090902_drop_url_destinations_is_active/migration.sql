/*
  Warnings:

  - You are about to drop the column `is_active` on the `url_destinations` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "idx_url_destinations_url_id_active";

-- AlterTable
ALTER TABLE "url_destinations" DROP COLUMN "is_active";

-- CreateIndex
CREATE INDEX "idx_url_destinations_url_id_created_at_desc" ON "url_destinations"("url_id", "created_at" DESC);
