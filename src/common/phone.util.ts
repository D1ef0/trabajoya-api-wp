import { BadRequestException } from '@nestjs/common';
import { normalizePhoneSV } from '../trabajoya/trabajoya.service';
import { TrabajoyaApiError } from '../trabajoya/trabajoya.types';

export function normalizeOutboundPhone(phone: string): string {
  const value = String(phone ?? '').trim();
  if (!value) {
    throw new BadRequestException('phone is required');
  }

  if (value.startsWith('+')) {
    return value;
  }

  try {
    return normalizePhoneSV(value);
  } catch (error) {
    if (error instanceof TrabajoyaApiError) {
      throw new BadRequestException('invalid phone number');
    }
    throw error;
  }
}
