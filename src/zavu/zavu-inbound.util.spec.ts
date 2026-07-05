import {
  normalizeZavuInboundData,
  resolveInboundSelection,
} from './zavu-inbound.util';
import { ZavuInboundMessageData } from './zavu.types';

describe('resolveInboundSelection', () => {
  it('reads list reply id from content.interactiveReply', () => {
    const data: ZavuInboundMessageData = {
      from: '+50377778888',
      messageType: 'interactive',
      content: {
        interactiveReply: {
          type: 'list_reply',
          id: 'menu_reset',
          title: 'Empezar de nuevo',
          description: 'Borrar registro y volver al inicio',
        },
      },
    };

    expect(resolveInboundSelection(data)).toBe('menu_reset');
  });

  it('prefers top-level listReply when present', () => {
    const data: ZavuInboundMessageData = {
      from: '+50377778888',
      listReply: { id: 'menu_profile', title: 'Abrir mi perfil' },
      content: {
        interactiveReply: {
          type: 'list_reply',
          id: 'menu_reset',
          title: 'Empezar de nuevo',
        },
      },
    };

    expect(resolveInboundSelection(data)).toBe('menu_profile');
  });

  it('falls back to trimmed text', () => {
    const data: ZavuInboundMessageData = {
      from: '+50377778888',
      text: '  reiniciar  ',
    };

    expect(resolveInboundSelection(data)).toBe('reiniciar');
  });

  it('reads list reply when interactiveReply omits type but has menu id', () => {
    const data: ZavuInboundMessageData = {
      from: '+50377778888',
      messageType: 'interactive',
      content: {
        interactiveReply: {
          id: 'menu_reset',
          title: 'Empezar de nuevo',
          description: 'Borrar registro y volver al inicio',
        },
      },
    };

    expect(resolveInboundSelection(data)).toBe('menu_reset');
  });
});

describe('normalizeZavuInboundData', () => {
  it('copies button replies from content.interactiveReply', () => {
    const data: ZavuInboundMessageData = {
      from: '+50377778888',
      content: {
        interactiveReply: {
          type: 'button_reply',
          id: 'ventas',
          title: 'Ventas',
        },
      },
    };

    expect(normalizeZavuInboundData(data).buttonReply).toEqual({
      id: 'ventas',
      title: 'Ventas',
    });
  });
});
