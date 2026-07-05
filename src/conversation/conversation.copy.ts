export const ConversationCopy = {
  welcome:
    '¡Hola! Bienvenido/a a *TrabajoYa*.\n\n' +
    'Te ayudamos a crear tu perfil laboral para encontrar empleos y cursos en El Salvador.\n\n' +
    '*Paso 1 de 2:* escribe tu *nombre completo* (nombre y apellido).\n' +
    'Ejemplo: María González\n\n' +
    'Comandos útiles: *menu* · *reiniciar*',
  invalidName:
    'Necesito tu *nombre completo* con al menos nombre y apellido.\n\n' +
    'Ejemplo: Juan Pérez\n\n' +
    'Escríbelo de nuevo o escribe *reiniciar* para empezar otra vez.',
  askCv: (fullName: string) =>
    `Gracias, ${fullName}.\n\n` +
    '*Paso 2 de 2:* ¿Tienes tu CV?\n\n' +
    '*Adjúntalo* como documento (PDF, Word .docx o TXT).\n' +
    'Si no lo tienes a mano, escribe *omitir* y lo completamos después en la entrevista de voz.\n\n' +
    'El CV nos ayuda a preparar tu perfil, pero no es obligatorio.',
  invalidCv:
    'En este paso necesito tu CV como *archivo adjunto* (PDF, Word o TXT) o que escribas *omitir*.\n\n' +
    'No envíes fotos ni texto suelto aquí. Si ya adjuntaste el archivo y falló, prueba otro formato o escribe *omitir*.',
  cvParseFailed:
    'No pudimos leer tu CV. El archivo puede estar dañado o ser un PDF escaneado como imagen.\n\n' +
    'Intenta con otro archivo (PDF con texto, Word .docx o TXT) o escribe *omitir* para continuar sin CV.',
  cvUnsupportedFormat:
    'Formato no soportado. Usa PDF, Word (.docx) o TXT.\n\n' +
    'Adjunta el archivo de nuevo o escribe *omitir* para continuar sin CV.',
  registrationSuccess: (fullName: string, url: string) =>
    `¡Listo, ${fullName}! Ya creamos tu registro en TrabajoYa.\n\n` +
    '*Siguiente paso:*\n' +
    '1. Abre este enlace en tu celular o computadora:\n' +
    `${url}\n` +
    '2. Inicia la *entrevista de voz* (~10 min) para completar tu perfil\n' +
    '3. Recibirás recomendaciones de empleos y cursos según tu perfil\n\n' +
    'Guarda el enlace por si lo necesitas después. También puedes escribir *menu* para ver opciones.',
  registrationSuccessWithoutCv: (fullName: string, url: string) =>
    `¡Listo, ${fullName}! Ya creamos tu registro en TrabajoYa.\n\n` +
    '*Siguiente paso:*\n' +
    '1. Abre este enlace en tu celular o computadora:\n' +
    `${url}\n` +
    '2. Inicia la *entrevista de voz* (~10 min) para completar tu perfil\n' +
    '3. Recibirás recomendaciones de empleos y cursos según tu perfil\n\n' +
    'Nota: no pudimos leer tu CV desde WhatsApp. Podrás subirlo o contarlo durante la entrevista de voz.\n\n' +
    'Guarda el enlace por si lo necesitas después. También puedes escribir *menu* para ver opciones.',
  mainMenuPrompt:
    '*Menú de TrabajoYa*\nElige una opción de la lista de abajo.',
  profileLink: (url: string) =>
    `Este es tu enlace de TrabajoYa:\n\n${url}\n\n` +
    'Ábrelo para continuar tu entrevista de voz y completar tu perfil laboral.',
  resetDone: 'Conversación reiniciada. Empezamos de cero.',
  completeRegistrationFirst:
    'Aún no terminamos tu registro.\n\n' +
    '*Paso 1 de 2:* escribe tu *nombre completo* (nombre y apellido) para continuar.',
  serviceUnavailable:
    'El registro no está disponible ahora. Intenta de nuevo en unos minutos escribiendo cualquier mensaje.',
  registrationFailed:
    'No pudimos crear tu registro. Intenta de nuevo en unos minutos o escribe *reiniciar* para empezar otra vez.',
  invalidPhone:
    'Tu número debe ser de El Salvador: 8 dígitos (ej. 77778888) o +503 seguido de 8 dígitos.\n\n' +
    'Si el problema continúa, escribe *reiniciar* o contáctanos.',
  zavuSendFailed:
    'No pudimos enviar el mensaje en este momento. Por favor intenta de nuevo.',
  zavuWindowClosed:
    'Pasaron más de 24 horas desde tu último mensaje. Escríbenos de nuevo (cualquier texto) para retomar.',
  zavuUrlBlocked:
    'No pudimos enviarte el enlace por un problema técnico. Escribe *menu* en unos minutos o contáctanos.',
  zavuEmailKycRequired:
    'El envío por correo no está disponible en este momento.',
} as const;
