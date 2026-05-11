/*
  Warnings:

  - A unique constraint covering the columns `[provider,provider_user_id]` on the table `user_auth_providers` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "user_refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "device_info" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_refresh_tokens_token_hash_key" ON "user_refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "idx_refresh_tokens_expires_at" ON "user_refresh_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "idx_refresh_tokens_is_revoked" ON "user_refresh_tokens"("is_revoked");

-- CreateIndex
CREATE INDEX "idx_refresh_tokens_user_id" ON "user_refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "idx_urls_created_by" ON "urls"("created_by");

-- CreateIndex
CREATE INDEX "idx_user_auth_providers_user_id" ON "user_auth_providers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_auth_providers_provider_provider_user_id_key" ON "user_auth_providers"("provider", "provider_user_id");

-- AddForeignKey
ALTER TABLE "user_refresh_tokens" ADD CONSTRAINT "user_refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
