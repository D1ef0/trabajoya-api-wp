export class SendAudioDto {
  text: string;
  phone: string;
  voiceId?: string;
  idempotencyKey?: string;
}
