import { resolveMenuOptionFromInbound } from './conversation.menu-options';
import { MenuOption } from './conversation.constants';
import { ZavuInboundMessageData } from '../zavu/zavu.types';

describe('resolveMenuOptionFromInbound', () => {
  it('maps list title text to menu_reset', () => {
    const data: ZavuInboundMessageData = {
      from: '+50377778888',
      text: 'Empezar de nuevo',
    };

    expect(resolveMenuOptionFromInbound(data)).toBe(MenuOption.RESET);
  });

  it('maps interactive list reply to menu_reset', () => {
    const data: ZavuInboundMessageData = {
      from: '+50377778888',
      content: {
        interactiveReply: {
          id: 'menu_reset',
          title: 'Empezar de nuevo',
          description: 'Borrar registro y volver al inicio',
        },
      },
    };

    expect(resolveMenuOptionFromInbound(data)).toBe(MenuOption.RESET);
  });
});
