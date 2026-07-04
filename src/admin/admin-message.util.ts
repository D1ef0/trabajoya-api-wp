export function extractMessagePreview(
  payload: unknown,
  direction: 'inbound' | 'outbound',
  type: string,
): string {
  if (!payload || typeof payload !== 'object') {
    return '—';
  }

  const record = payload as Record<string, unknown>;

  if (direction === 'outbound' && typeof record.text === 'string') {
    return record.text;
  }

  const data =
    record.data && typeof record.data === 'object'
      ? (record.data as Record<string, unknown>)
      : record;

  if (typeof data.text === 'string' && data.text.trim()) {
    return data.text;
  }

  const buttonReply = data.buttonReply as
    | { id?: string; title?: string }
    | undefined;
  if (buttonReply?.title) {
    return `[Botón] ${buttonReply.title}`;
  }

  const listReply = data.listReply as
    | { id?: string; title?: string }
    | undefined;
  if (listReply?.title) {
    return `[Lista] ${listReply.title}`;
  }

  if (typeof data.messageType === 'string' && data.messageType !== 'text') {
    const content =
      data.content && typeof data.content === 'object'
        ? (data.content as Record<string, unknown>)
        : undefined;
    const filename =
      typeof data.filename === 'string'
        ? data.filename
        : typeof content?.filename === 'string'
          ? content.filename
          : undefined;

    if (filename) {
      return `[${data.messageType}] ${filename}`;
    }

    return `[${data.messageType}]`;
  }

  if (type === 'button_reply') return '[Respuesta botón]';
  if (type === 'list_reply') return '[Respuesta lista]';

  try {
    const raw = JSON.stringify(record);
    return raw.length > 100 ? `${raw.slice(0, 100)}…` : raw;
  } catch {
    return '—';
  }
}
