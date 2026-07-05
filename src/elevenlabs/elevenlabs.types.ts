export interface SynthesizeOptions {
  text: string;
  voiceId?: string;
}

export interface SynthesizeResult {
  audio: Buffer;
  characterCost?: string;
  requestId?: string;
}

export class ElevenLabsNotConfiguredError extends Error {
  constructor() {
    super('ElevenLabs API is not configured');
    this.name = 'ElevenLabsNotConfiguredError';
  }
}

export class ElevenLabsApiError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly publicError?: string,
  ) {
    super(message);
    this.name = 'ElevenLabsApiError';
  }
}
