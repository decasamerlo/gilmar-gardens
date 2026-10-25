import { randomUUID } from 'expo-crypto';

export function novoId(): string {
  return globalThis.crypto?.randomUUID?.() ?? randomUUID();
}
