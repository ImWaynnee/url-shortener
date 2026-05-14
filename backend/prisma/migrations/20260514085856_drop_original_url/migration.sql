/*
  Warnings:

  - You are about to drop the column `original_url` on the `urls` table. All the data in the column will be lost.
  - Made the column `destination_url` on table `url_destinations` required. This step will fail if there are existing NULL values in that column.

*/

INSERT INTO "url_destinations" ("url_id", "destination_url", "is_active", "created_at")
SELECT 
    "id", 
    "original_url", 
    true, 
    "created_at"
FROM "urls"
WHERE "original_url" IS NOT NULL; -- Prevents inserting nulls into the new table

-- AlterTable
ALTER TABLE "url_destinations" ALTER COLUMN "destination_url" SET NOT NULL;

-- AlterTable
ALTER TABLE "urls" DROP COLUMN "original_url";
