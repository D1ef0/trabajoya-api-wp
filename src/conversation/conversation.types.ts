export interface ConversationContext {
  fullName?: string;
  intakeCode?: string;
  intakeUrl?: string;
}

export interface ConversationHandleResult {
  replyText: string;
  nextStep?: string;
  contextPatch?: ConversationContext;
}

export function parseConversationContext(
  context: unknown,
): ConversationContext {
  if (!context || typeof context !== 'object' || Array.isArray(context)) {
    return {};
  }

  const record = context as Record<string, unknown>;

  return {
    fullName:
      typeof record.fullName === 'string' ? record.fullName : undefined,
    intakeCode:
      typeof record.intakeCode === 'string' ? record.intakeCode : undefined,
    intakeUrl:
      typeof record.intakeUrl === 'string' ? record.intakeUrl : undefined,
  };
}
