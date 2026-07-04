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
