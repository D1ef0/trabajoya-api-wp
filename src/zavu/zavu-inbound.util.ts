import { ZavuInboundMessageData } from './zavu.types';

export interface ZavuInboundContent {
  mediaId?: string;
  mediaUrl?: string;
  mimeType?: string;
  filename?: string;
  interactiveReply?: {
    type?: string;
    id?: string;
    title?: string;
    description?: string;
  };
}

export function normalizeZavuInboundData(
  data: ZavuInboundMessageData,
): ZavuInboundMessageData {
  const content = readContent(data);
  if (!content) {
    return data;
  }

  const interactiveReply = content.interactiveReply;
  const buttonReply =
    data.buttonReply ??
    (interactiveReply?.type === 'button_reply' &&
    interactiveReply.id &&
    interactiveReply.title
      ? { id: interactiveReply.id, title: interactiveReply.title }
      : undefined);
  const listReply =
    data.listReply ??
    (interactiveReply?.id &&
    interactiveReply.title &&
    interactiveReply.type !== 'button_reply' &&
    isListInteractiveReply(interactiveReply)
      ? {
          id: interactiveReply.id,
          title: interactiveReply.title,
          description: interactiveReply.description,
        }
      : undefined);

  return {
    ...data,
    mediaUrl: data.mediaUrl ?? content.mediaUrl,
    mediaId: data.mediaId ?? content.mediaId,
    mimeType: data.mimeType ?? content.mimeType,
    filename: data.filename ?? content.filename,
    buttonReply,
    listReply,
  };
}

function readContent(data: ZavuInboundMessageData): ZavuInboundContent | undefined {
  const record = data as ZavuInboundMessageData & { content?: unknown };
  if (!record.content || typeof record.content !== 'object') {
    return undefined;
  }

  return record.content as ZavuInboundContent;
}

function isListInteractiveReply(
  reply: NonNullable<ZavuInboundContent['interactiveReply']>,
): boolean {
  if (reply.type === 'list_reply') {
    return true;
  }

  if (reply.type === 'button_reply') {
    return false;
  }

  return (
    reply.type === undefined ||
    reply.type === 'interactive' ||
    Boolean(reply.id?.startsWith('menu_'))
  );
}

export function isDocumentInbound(data: ZavuInboundMessageData): boolean {
  const normalized = normalizeZavuInboundData(data);

  if (normalized.messageType === 'document') {
    return true;
  }

  return Boolean(
    normalized.mediaUrl &&
      normalized.messageType !== 'image' &&
      normalized.messageType !== 'sticker',
  );
}

export function resolveInboundSelection(
  data: ZavuInboundMessageData,
): string | undefined {
  const normalized = normalizeZavuInboundData(data);
  return (
    normalized.listReply?.id ??
    normalized.buttonReply?.id ??
    normalized.text?.trim()
  );
}

export function buildInboundMediaDebug(
  data: ZavuInboundMessageData,
): Record<string, unknown> {
  const normalized = normalizeZavuInboundData(data);
  const content = readContent(data);

  return {
    messageType: normalized.messageType ?? null,
    topLevelMediaUrl: Boolean(data.mediaUrl),
    contentMediaUrl: Boolean(content?.mediaUrl),
    contentMediaId: content?.mediaId ?? null,
    filename: normalized.filename ?? null,
    mimeType: normalized.mimeType ?? null,
  };
}
