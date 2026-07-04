import { SendInteractiveParams } from '../zavu/zavu.types';
import { MenuOption } from './conversation.constants';

export function buildMainMenuInteractive(
  text: string,
): Omit<SendInteractiveParams, 'to'> {
  return {
    text,
    messageType: 'list',
    listButton: 'Ver opciones',
    sections: [
      {
        title: 'TrabajoYa',
        rows: [
          {
            id: MenuOption.PROFILE,
            title: 'Ver mi perfil',
            description: 'Abrir enlace de registro',
          },
          {
            id: MenuOption.RESET,
            title: 'Reiniciar',
            description: 'Empezar de nuevo (pruebas)',
          },
        ],
      },
    ],
  };
}
