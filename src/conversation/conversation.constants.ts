export const ConversationStep = {
  MENU_ROOT: 'MENU_ROOT',
  ASK_FULL_NAME: 'ASK_FULL_NAME',
  ASK_CV: 'ASK_CV',
  INTAKE_REGISTERED: 'INTAKE_REGISTERED',
  MENU_MAIN: 'MENU_MAIN',
} as const;

export type ConversationStepValue =
  (typeof ConversationStep)[keyof typeof ConversationStep];

export const MenuOption = {
  PROFILE: 'menu_profile',
  RESET: 'menu_reset',
} as const;

export type MenuOptionValue = (typeof MenuOption)[keyof typeof MenuOption];
