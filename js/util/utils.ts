import fs from 'fs';
import path from 'path';

import { parse as parseYmlToJson } from 'yaml';

const assignSecrets = (data: Record<string, unknown>, result: Record<string, unknown>): void => {
  Object.keys(data).forEach((k) => {
    const value = data[k];

    if (value !== null && typeof value === 'object') {
      result[k] = {};
      assignSecrets(value as Record<string, unknown>, result[k] as Record<string, unknown>);
    } else {
      result[k] = value;
    }
  });
};

export const mapSecretToJson = (secrets: string[]): Record<string, unknown> => {
  const result: Record<string, unknown> = {};

  secrets.forEach((secretPath) => {
    try {
      const data: unknown = parseYmlToJson(fs.readFileSync(secretPath, 'utf8'));

      if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
        assignSecrets(data as Record<string, unknown>, result);
      } else {
        console.error(`Secret file ${secretPath} did not contain an object`);
      }
    } catch (error) {
      console.error(`Error reading or parsing secret file`, error);
    }
  });

  return result;
};

export const buildContentFilePath = (fileName: string): string => {
  const normalizedPath = path.normalize(fileName).replace(/^(\.\.\/|\.\.)+/, '');
  return path.join(process.env.CONTENT_FOLDER || 'data', normalizedPath);
};

export const isValidFilename = (fileName: string): boolean => {
  return !!fileName && /^[0-9a-zA-Z-._/õäöüÕÄÖÜ]+$/.test(fileName);
};

export const isValidFilePath = (filePath: string): boolean => {
  return !!filePath && isValidFilename(filePath) && !path.normalize(filePath).includes('..');
};

export const getAllFiles = function (dirPath: string): string[] {
  const folder = path.join(process.env.CONTENT_FOLDER || 'data', dirPath);
  return getAllFilesInsideFolder(folder);
};

const getAllFilesInsideFolder = function (dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);

  files.forEach(function (file) {
    if (fs.statSync(path.join(dirPath, file)).isDirectory()) {
      arrayOfFiles = getAllFilesInsideFolder(path.join(dirPath, file), arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, file));
    }
  });

  return arrayOfFiles;
};

export const readFile = function (filePath: string): string {
  const data = fs.readFileSync(filePath, { encoding: 'utf8' });
  return Buffer.from(data).toString();
};

export const parseBoolean = (value: string): boolean => {
  return value?.toLowerCase() === 'true';
};

export const getUrl = (dir: string): string => {
  let startIndex: number;
  if (dir.includes('/POST')) {
    startIndex = dir.indexOf('/POST') + '/POST'.length;
  } else {
    startIndex = dir.indexOf('/GET') + '/GET'.length;
  }
  return dir.substring(startIndex);
};

export const getHeadersMapping = (csv_type?: string): Record<string, string> => {
  if (csv_type === 'companies') {
    return {
      Registrikood: 'registry_code',
      Nimi: 'name',
      Liik: 'type',
      'Registreeritud käibemaksukohustuslaste registrisse': 'vat_register',
      'EMTAK tegevusvaldkond, mis on EMTAKi struktuuris tähistatud tähtkoodiga': 'emtak_field_of_activity',
      Maakond: 'county',
      'Riiklikud Maksud': 'national_taxes',
      'Tööjõumaksud Ja Maksed': 'labor_taxes_and_payments',
      Kaive: 'turnover',
      Tootajaid: 'workers',
    };
  } else if (csv_type === 'municipalities') {
    return {
      KUU: 'month',
      MAAKOND: 'county',
      'KOHALIK OMAVALITSUS': 'local_government',
      TEGEVUSALA: 'field_of_activity',
      'Keskmine palk sellel tegevusalal omavalitsuse territooriumil tegutsevates ettevõtetes (eurodes)':
        'average_salary_in_field_of_activity_municipality',
      'Keskmine palk Eestis (eurodes)': 'average_salary_estonia',
      'Keskmine palk sellel tegevusalal (eurodes)': 'average_salary_in_field_of_activity',
      'Juriidiliste isikute arv omavalitsuses': 'legal_entities_count_municipality',
      'Tegutsevate ettevõtete arv omavalitsuses': 'companies_count_municipality',
      'Tegutsevate ettevõtete arv Eestis': 'companies_count_estonia',
      'Tegutsevate ettevõtete arv sellel tegevusalal': 'companies_count_in_field_of_activity',
      'Töötajatega ettevõtete arv omavalitsuses': 'companies_count_with_employees_municipality',
      'Töötajatega ettevõtete arv Eestis': 'companies_count_with_employees_estonia',
      'Töötajatega ettevõtete arv sellel tegevusalal Eestis':
        'companies_count_with_employees_in_field_of_activity_estonia',
      'Deklaratsiooni KMD esitavate juriidiliste isikute arv omavalitsuses': 'municipality_legal_entities_kmd_count',
      'Käive kokku (eurodes)': 'total_turnover',
      'Eksport  (eurodes)': 'export',
      'Tasumisele kuuluv käibemaks (eurodes)': 'vat_payable',
      'Omavalitsuse tööandjate deklaratsioonis TSD märgitud töötajate arv': 'municipal_employers_tsd_count',
      'Omavalitsuse tööandjate  deklareeritud tööjõumaksud (eurodes)': 'labor_taxes_declared_by_municipal_employer',
    };
  } else {
    return {};
  }
};

export const parseJwt = (token: string): any => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf-8');
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Invalid JWT:', error);
    return null;
  }
};
