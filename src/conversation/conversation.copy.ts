export const ConversationCopy = {
  welcome:
    '¡Hola! Bienvenido/a a TrabajoYa. Para comenzar, por favor escribe tu *nombre completo*.',
  invalidName:
    'Necesito tu nombre completo (nombre y apellido). Por favor inténtalo de nuevo.',
  registrationSuccess: (fullName: string, url: string) =>
    `¡Listo, ${fullName}! Tu registro fue creado. Continúa tu perfil aquí:\n${url}\n\nEscribe *menu* para regresar al menú principal.`,
  alreadyRegistered: (url: string) =>
    `Ya estás registrado. Puedes continuar tu perfil aquí:\n${url}\n\nEscribe *menu* para regresar al menú principal.`,
  mainMenuPlaceholder:
    'Menú principal de TrabajoYa.\n\nOpciones próximamente.',
  serviceUnavailable:
    'El servicio de registro no está disponible en este momento. Por favor intenta más tarde.',
  registrationFailed:
    'No pudimos completar tu registro en este momento. Por favor intenta de nuevo en unos minutos.',
  invalidPhone:
    'No pudimos validar tu número de teléfono. Por favor contacta soporte.',
} as const;
