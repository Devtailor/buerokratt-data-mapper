export function base64ToText(base64String: string): string {
  return Buffer.from(base64String, 'base64').toString('utf8');
}
