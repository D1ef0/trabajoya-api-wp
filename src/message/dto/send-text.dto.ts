export class SendTextDto {
  text: string;
  phone: string;
  idempotencyKey?: string;
}
