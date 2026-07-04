export const CONVERSATION_QUEUE = 'conversation';

export interface ConversationJobPayload {
  waMessageId: string;
  waNumber: string;
  event: Record<string, unknown>;
}
