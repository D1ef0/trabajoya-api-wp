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
            title: 'Abrir mi perfil',
            description: 'Ver enlace y continuar entrevista de voz',
          },
          {
            id: MenuOption.RESET,
            title: 'Empezar de nuevo',
            description: 'Borrar registro y volver al inicio',
          },
        ],
      },
    ],
  };
}
