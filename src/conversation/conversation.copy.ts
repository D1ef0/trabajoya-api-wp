export const ConversationCopy = {
  welcome:
    '¡Hola! Bienvenido/a a TrabajoYa. Para comenzar, por favor escribe tu *nombre completo*.',
  invalidName:
    'Necesito tu nombre completo (nombre y apellido). Por favor inténtalo de nuevo.',
  askCv: (fullName: string) =>
    `Gracias, ${fullName}. ¿Tienes tu CV?\n\nAdjunta el archivo (PDF, Word o TXT) o escribe *omitir* para continuar sin CV.`,
  invalidCv:
    'No pude procesar ese mensaje. Adjunta tu CV como documento o escribe *omitir* para continuar sin él.',
  cvParseFailed:
    'No pudimos leer tu CV. Intenta con otro archivo (PDF, Word o TXT) o escribe *omitir* para continuar sin CV.',
  cvUnsupportedFormat:
    'Formato no soportado. Usa PDF, Word (.docx) o TXT, o escribe *omitir* para continuar sin CV.',
  registrationSuccess: (fullName: string, url: string) =>
    `¡Listo, ${fullName}! Tu registro fue creado. Continúa tu perfil aquí:\n${url}`,
  registrationSuccessWithoutCv: (fullName: string, url: string) =>
    `¡Listo, ${fullName}! Tu registro fue creado. Continúa tu perfil aquí:\n${url}\n\nNo pudimos adjuntar tu CV automáticamente; podrás completarlo en la conversación de voz.`,
  mainMenuPrompt:
    'Menú principal de TrabajoYa. Elige una opción de la lista.',
  profileLink: (url: string) =>
    `Puedes continuar tu perfil aquí:\n${url}`,
  resetDone:
    'Conversación reiniciada. Empecemos de nuevo.',
  completeRegistrationFirst:
    'Primero completa tu registro. Escribe tu *nombre completo* para continuar.',
  serviceUnavailable:
    'El servicio de registro no está disponible en este momento. Por favor intenta más tarde.',
  registrationFailed:
    'No pudimos completar tu registro en este momento. Por favor intenta de nuevo en unos minutos.',
  invalidPhone:
    'No pudimos validar tu número de teléfono. Por favor contacta soporte.',
} as const;
