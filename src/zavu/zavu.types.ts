export interface ZavuInboundMessageData {
  id: string;
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
  type: string;
  data: ZavuInboundMessageData;
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
