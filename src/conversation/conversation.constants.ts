export const ConversationStep = {
  MENU_ROOT: 'MENU_ROOT',
  ASK_FULL_NAME: 'ASK_FULL_NAME',
  INTAKE_REGISTERED: 'INTAKE_REGISTERED',
  MENU_MAIN: 'MENU_MAIN',
} as const;

export type ConversationStepValue =
  (typeof ConversationStep)[keyof typeof ConversationStep];
