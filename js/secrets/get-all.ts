import { getAllFiles, mapSecretToJson } from '../util';

const flattenSecrets = (data: Record<string, unknown>, path: string, result: string[]): void => {
  Object.keys(data).forEach((k) => {
    const value = data[k];
    const secretPath = path.length > 0 ? `${path}.${k}` : k;

    if (value !== null && typeof value === 'object') {
      flattenSecrets(value as Record<string, unknown>, secretPath, result);
    } else if (!result.includes(secretPath)) {
      result.push(secretPath);
    }
  });
};

export function getAllSecrets(): { prod: string[]; test: string[] } {
  const secrets = {
    prod: [] as string[],
    test: [] as string[],
  };
  flattenSecrets(mapSecretToJson(getAllFiles('/secrets/prod')), '', secrets.prod);
  flattenSecrets(mapSecretToJson(getAllFiles('/secrets/test')), '', secrets.test);
  return secrets;
}
