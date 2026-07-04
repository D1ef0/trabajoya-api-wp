import { Injectable, Logger } from '@nestjs/common';
import { MarkItDown } from 'markitdown-ts';
import {
  isMarkitdownErrorText,
  sanitizeCvFileName,
  sanitizeCvText,
} from '../common/cv-text.util';
import { CvParseError } from './cv-parser.types';

const SUPPORTED_EXTENSIONS = new Set([
  '.pdf',
  '.docx',
  '.doc',
  '.txt',
  '.md',
  '.html',
  '.htm',
]);

@Injectable()
export class CvParserService {
  private readonly logger = new Logger(CvParserService.name);
  private readonly markitdown = new MarkItDown();

  async convertFromUrl(
    url: string,
    fileName?: string,
    mimeType?: string,
  ): Promise<{ text: string; fileName: string }> {
    let response: Response;
    try {
      response = await fetch(url);
    } catch (error) {
      this.logger.error(`CV download failed: ${String(error)}`);
      throw new CvParseError('Could not download CV file', 'download_failed');
    }

    if (!response.ok) {
      this.logger.error(
        `CV download failed (${response.status}) for ${fileName ?? url}`,
      );
      throw new CvParseError(
        `CV download failed with status ${response.status}`,
        'download_failed',
      );
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const resolvedFileName =
      fileName ||
      extractFileNameFromUrl(url) ||
      guessFileName(mimeType) ||
      'cv.pdf';
    const extension = resolveExtension(resolvedFileName, mimeType);

    if (!SUPPORTED_EXTENSIONS.has(extension)) {
      throw new CvParseError(
        `Unsupported CV extension: ${extension}`,
        'unsupported_format',
      );
    }

    let result;
    try {
      result = await this.markitdown.convertBuffer(buffer, {
        file_extension: extension,
      });
    } catch (error) {
      this.logger.error(`CV conversion failed: ${String(error)}`);
      throw new CvParseError('CV conversion failed', 'conversion_failed');
    }

    const rawText = normalizeExtractedText(result?.text_content ?? '');
    if (!rawText || isMarkitdownErrorText(rawText)) {
      throw new CvParseError('CV file has no readable text', 'empty_text');
    }

    const text = sanitizeCvText(rawText);
    if (!text) {
      throw new CvParseError('CV file has no readable text', 'empty_text');
    }

    return {
      text,
      fileName: sanitizeCvFileName(resolvedFileName),
    };
  }
}

function resolveExtension(fileName: string, mimeType?: string): string {
  const fromName = pathExtension(fileName);
  if (fromName) {
    return fromName;
  }

  switch (mimeType) {
    case 'application/pdf':
      return '.pdf';
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return '.docx';
    case 'application/msword':
      return '.doc';
    case 'text/plain':
      return '.txt';
    default:
      return '';
  }
}

function pathExtension(fileName: string): string {
  const match = fileName.toLowerCase().match(/(\.[a-z0-9]+)$/);
  return match?.[1] ?? '';
}

function extractFileNameFromUrl(url: string): string | undefined {
  try {
    const pathname = new URL(url).pathname;
    const segment = pathname.split('/').pop();
    return segment?.includes('.') ? segment : undefined;
  } catch {
    return undefined;
  }
}

function guessFileName(mimeType?: string): string | undefined {
  switch (mimeType) {
    case 'application/pdf':
      return 'cv.pdf';
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return 'cv.docx';
    case 'application/msword':
      return 'cv.doc';
    case 'text/plain':
      return 'cv.txt';
    default:
      return undefined;
  }
}

function normalizeExtractedText(value: string): string {
  return value
    .replace(/\u0000/g, '')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
