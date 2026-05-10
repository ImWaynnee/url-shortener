-- CreateTable
CREATE TABLE "urls" (
    "id" BIGSERIAL NOT NULL,
    "short_url" VARCHAR(7) NOT NULL,
    "original_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "urls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "urls_short_url_key" ON "urls"("short_url");
