import {
  normalizeZavuInboundData,
  resolveInboundSelection,
} from '../zavu/zavu-inbound.util';
import { ZavuInboundMessageData } from '../zavu/zavu.types';
import { MenuOption, MenuOptionValue } from './conversation.constants';

const MENU_TITLE_TO_OPTION: Record<string, MenuOptionValue> = {
  'abrir mi perfil': MenuOption.PROFILE,
  'empezar de nuevo': MenuOption.RESET,
};

export function resolveMenuOptionFromInbound(
  data: ZavuInboundMessageData,
): MenuOptionValue | undefined {
  const normalized = normalizeZavuInboundData(data);
  const selection = normalizeMenuLabel(resolveInboundSelection(normalized));
  if (selection === MenuOption.PROFILE || selection === MenuOption.RESET) {
    return selection;
  }

  const listTitle = normalizeMenuLabel(normalized.listReply?.title);
  if (listTitle && MENU_TITLE_TO_OPTION[listTitle]) {
    return MENU_TITLE_TO_OPTION[listTitle];
  }

  if (selection && MENU_TITLE_TO_OPTION[selection]) {
    return MENU_TITLE_TO_OPTION[selection];
  }

  return undefined;
}

function normalizeMenuLabel(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return value.trim().toLowerCase().replace(/\*/g, '');
}
