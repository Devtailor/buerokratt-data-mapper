export function stringToBase64Encrypt(content: string): { cipher?: string } | undefined {
  try {
    return {
      cipher: btoa(content),
    };
  } catch (err) {
    console.error("String couldn't be converted to base64", err);
    return undefined;
  }
}
