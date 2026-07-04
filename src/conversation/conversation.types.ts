import { SendInteractiveParams } from '../zavu/zavu.types';

export interface ConversationContext {
  fullName?: string;
  intakeCode?: string;
  intakeUrl?: string;
  cvFileName?: string;
  cvSkipped?: boolean;
}

export interface ConversationHandleResult {
  replyText: string;
  replyInteractive?: Omit<SendInteractiveParams, 'to'>;
  nextStep?: string;
  contextPatch?: ConversationContext;
  resetSession?: boolean;
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
    cvFileName:
      typeof record.cvFileName === 'string' ? record.cvFileName : undefined,
    cvSkipped:
      typeof record.cvSkipped === 'boolean' ? record.cvSkipped : undefined,
  };
}
