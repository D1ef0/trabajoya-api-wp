-- CreateTable
CREATE TABLE "inbound_request_captures" (
    "id" UUID NOT NULL,
    "method" VARCHAR(16) NOT NULL,
    "path" VARCHAR(2048) NOT NULL,
    "query_string" TEXT,
    "headers" JSONB NOT NULL,
    "body" TEXT,
    "ip" VARCHAR(64),
    "user_agent" VARCHAR(512),
    "status_code" INTEGER,
    "duration_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inbound_request_captures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inbound_request_captures_created_at_idx" ON "inbound_request_captures"("created_at" DESC);

-- CreateIndex
CREATE INDEX "inbound_request_captures_path_idx" ON "inbound_request_captures"("path");
