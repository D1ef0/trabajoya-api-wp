export interface ZavuInboundMessageData {
  /** Present in real Zavu webhooks */
  messageId?: string;
  /** Legacy/test payloads */
  id?: string;
  from: string;
  to?: string;
  text?: string;
  messageType?: string;
  buttonReply?: {
    id: string;
    title: string;
  };
  listReply?: {
    id: string;
    title: string;
    description?: string;
  };
  mediaUrl?: string;
  mediaId?: string;
  mimeType?: string;
  filename?: string;
  caption?: string;
  content?: {
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
  };
}

export interface ZavuWebhookEvent {
  id?: string;
  type: string;
  timestamp?: number;
  senderId?: string;
  projectId?: string;
  data: ZavuInboundMessageData;
}

export function resolveInboundMessageId(
  data: ZavuInboundMessageData,
): string | undefined {
  return data.messageId ?? data.id;
}

export interface ZavuButton {
  id: string;
  title: string;
}

export interface ZavuListRow {
  id: string;
  title: string;
  description?: string;
}

export interface ZavuListSection {
  title: string;
  rows: ZavuListRow[];
}

export interface SendInteractiveParams {
  to: string;
  text: string;
  messageType: 'buttons' | 'list';
  buttons?: ZavuButton[];
  listButton?: string;
  sections?: ZavuListSection[];
}

export interface ZavuSendFailure {
  code: string;
  status: number | undefined;
  message: string;
  retryable: boolean;
}

export type ZavuSendResult<T = unknown> =
  | { ok: true; response: T }
  | { ok: false; failure: ZavuSendFailure };
