export default function base64ToText(base64String) {
  return Buffer.from(base64String, 'base64').toString('utf8');
}
