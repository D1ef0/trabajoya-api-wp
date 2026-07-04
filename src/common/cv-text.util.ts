export const MAX_CV_TEXT_LENGTH = 12000;

export function sanitizeCvText(value: string): string {
  let cleaned = Buffer.from(value, 'utf8')
    .toString('utf8')
    .replace(/\u0000/g, '')
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, ' ')
    .replace(/[\uD800-\uDFFF]/g, '')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (cleaned.length <= MAX_CV_TEXT_LENGTH) {
    return cleaned;
  }

  return `${cleaned.slice(0, MAX_CV_TEXT_LENGTH)}\n\n[Texto truncado para la conversacion]`;
}

export function sanitizeCvFileName(value: string): string {
  const cleaned = value.trim().replace(/[^\w.\-() ]+/g, '_');
  return cleaned.slice(0, 200) || 'cv.pdf';
}

export function isMarkitdownErrorText(value: string): boolean {
  return value.trimStart().startsWith('[ERROR]');
}
