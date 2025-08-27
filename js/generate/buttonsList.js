export default function generateButtonsList(list, service_name, key, payload_prefix, payload_keys = []) {
  if (!Array.isArray(list)) return [];
  if (typeof service_name !== 'string' || service_name.trim() === '') return [];
  if (typeof key !== 'string' || key.trim() === '') return [];
  if (!Array.isArray(payload_keys)) return [];

  const allKeys = [key, ...payload_keys];

  for (const obj of list) {
    for (const k of allKeys) {
      if (!(k in obj)) {
        return [];
      }
    }
  }

  return list.map((obj) => {
    const title = obj[key];
    let payload = `${payload_prefix}${service_name}`;

    if (payload_keys.length > 0) {
      const payloadValues = payload_keys.map((k) => obj[k]);
      payload += `, (${payloadValues.join(', ')})`;
    }

    return {
      title,
      payload,
    };
  });
}
