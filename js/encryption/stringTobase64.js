export default async function stringToBase64Encrypt(value) {
  try {
    return {
      cipher: btoa(value)
    };
  } catch (err) {
    console.error("String couldn't be converted to base64", err);
  }
}
