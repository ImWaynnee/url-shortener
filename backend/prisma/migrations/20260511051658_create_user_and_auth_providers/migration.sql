CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT,
    "last_login_at" TIMESTAMP(3),
    "last_login_provider" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

INSERT INTO "users" ("id", "email", "full_name", "created_at")
VALUES ('00000000-0000-0000-0000-000000000001', 'default@wyzwyz.xyz', 'Default User', CURRENT_TIMESTAMP);

CREATE TABLE "user_auth_providers" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_user_id" TEXT,
    "secret" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "user_auth_providers_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "urls" ADD COLUMN "comments" TEXT,
ADD COLUMN "created_by" UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "updated_at" DROP NOT NULL;

ALTER TABLE "user_auth_providers" ADD CONSTRAINT "user_auth_providers_user_id_fkey" 
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "urls" ADD CONSTRAINT "urls_created_by_fkey" 
  FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
