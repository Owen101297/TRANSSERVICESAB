import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;
const PREFIX = "scrypt";
const STRONG_PASSWORD = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,72}$/;

export function isStrongPassword(value: string): boolean {
  return STRONG_PASSWORD.test(value);
}

export function isPasswordHash(value: string | null | undefined): boolean {
  return Boolean(value?.startsWith(`${PREFIX}$`));
}

export async function hashPassword(value: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(value, salt, KEY_LENGTH)) as Buffer;
  return `${PREFIX}$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(
  candidate: string,
  stored: string | null | undefined
): Promise<boolean> {
  if (!stored || !candidate) return false;

  if (!isPasswordHash(stored)) {
    const left = Buffer.from(candidate);
    const right = Buffer.from(stored);
    return left.length === right.length && timingSafeEqual(left, right);
  }

  const [, salt, expectedHex] = stored.split("$");
  if (!salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = (await scrypt(candidate, salt, expected.length)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
