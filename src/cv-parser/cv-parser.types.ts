export class CvParseError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'download_failed'
      | 'unsupported_format'
      | 'empty_text'
      | 'conversion_failed',
  ) {
    super(message);
    this.name = 'CvParseError';
  }
}
