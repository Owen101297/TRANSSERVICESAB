import { timingSafeEqual } from "node:crypto";

export function isValidWebhookApiKey(provided: string | null | undefined, expected: string | undefined) {
  if (!provided || !expected) return false;

  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
}
