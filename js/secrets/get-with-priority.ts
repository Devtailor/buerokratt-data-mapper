import { getAllFiles, mapSecretToJson } from '../util';

export function getSecretsWithPriority(priority: string): Record<string, any> {
  const prodSecrets = mapSecretToJson(getAllFiles('/secrets/prod'));
  const testSecrets = mapSecretToJson(getAllFiles('/secrets/test'));

  const mergeSecrets = (
    secrets: Record<string, unknown>,
    result: Record<string, unknown>,
    isProdSecrets: boolean,
    isProdPriority: boolean,
  ): Record<string, unknown> => {
    Object.keys(secrets).forEach((k) => {
      const value = secrets[k];
      const current = result[k];

      if (value !== null && typeof value === 'object') {
        if (current === undefined) result[k] = {};

        return mergeSecrets(
          value as Record<string, unknown>,
          result[k] as Record<string, unknown>,
          isProdSecrets,
          isProdPriority,
        );
      }

      if (current === undefined || (!isProdSecrets && !isProdPriority)) {
        result[k] = value;
      }
    });
    return result;
  };

  const result: Record<string, unknown> = {};
  mergeSecrets(prodSecrets, result, true, priority !== 'test');
  mergeSecrets(testSecrets, result, false, priority !== 'test');
  return result;
}
