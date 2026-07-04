-- Deduplicate inbound message processing (retries / duplicate webhooks).
CREATE UNIQUE INDEX "messages_log_wa_message_id_direction_key"
ON "messages_log" ("wa_message_id", "direction");
