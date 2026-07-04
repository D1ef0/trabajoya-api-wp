-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('active', 'idle', 'closed', 'handoff');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('inbound', 'outbound');

-- CreateTable
CREATE TABLE "conversation_sessions" (
    "id" UUID NOT NULL,
    "wa_number" VARCHAR(32) NOT NULL,
    "current_step" VARCHAR(64) NOT NULL DEFAULT 'MENU_ROOT',
    "context" JSONB NOT NULL DEFAULT '{}',
    "status" "SessionStatus" NOT NULL DEFAULT 'active',
    "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages_log" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "direction" "MessageDirection" NOT NULL,
    "type" VARCHAR(32) NOT NULL,
    "payload" JSONB NOT NULL,
    "wa_message_id" VARCHAR(128),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" UUID NOT NULL,
    "wa_message_id" VARCHAR(128) NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "conversation_sessions_wa_number_key" ON "conversation_sessions"("wa_number");

-- CreateIndex
CREATE INDEX "messages_log_session_id_idx" ON "messages_log"("session_id");

-- CreateIndex
CREATE INDEX "messages_log_wa_message_id_idx" ON "messages_log"("wa_message_id");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_wa_message_id_key" ON "webhook_events"("wa_message_id");

-- AddForeignKey
ALTER TABLE "messages_log" ADD CONSTRAINT "messages_log_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "conversation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
