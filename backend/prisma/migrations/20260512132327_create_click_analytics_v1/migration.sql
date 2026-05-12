-- CreateTable
CREATE TABLE "url_stats" (
    "id" BIGSERIAL NOT NULL,
    "url_id" BIGINT NOT NULL,
    "total_clicks" INTEGER NOT NULL DEFAULT 0,
    "clicks_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_clicked_at" TIMESTAMP(3),

    CONSTRAINT "url_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "url_clicks" (
    "id" BIGSERIAL NOT NULL,
    "url_id" BIGINT NOT NULL,
    "destination_id" BIGINT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "referrer" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "url_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "url_destinations" (
    "id" BIGSERIAL NOT NULL,
    "url_id" BIGINT NOT NULL,
    "destination_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "url_destinations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_url_stats_url_id" ON "url_stats"("url_id");

-- CreateIndex
CREATE INDEX "idx_url_clicks_url_id" ON "url_clicks"("url_id");

-- CreateIndex
CREATE INDEX "idx_url_clicks_destination_id" ON "url_clicks"("destination_id");

-- CreateIndex
CREATE INDEX "idx_url_clicks_created_at_desc" ON "url_clicks"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_url_destinations_url_id" ON "url_destinations"("url_id");

-- CreateIndex
CREATE INDEX "idx_url_destinations_url_id_active" ON "url_destinations"("url_id") WHERE ("is_active" = true);

-- AddForeignKey
ALTER TABLE "url_stats" ADD CONSTRAINT "url_stats_url_id_fkey" FOREIGN KEY ("url_id") REFERENCES "urls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "url_clicks" ADD CONSTRAINT "url_clicks_url_id_fkey" FOREIGN KEY ("url_id") REFERENCES "urls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "url_clicks" ADD CONSTRAINT "url_clicks_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "url_destinations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "url_destinations" ADD CONSTRAINT "url_destinations_url_id_fkey" FOREIGN KEY ("url_id") REFERENCES "urls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
