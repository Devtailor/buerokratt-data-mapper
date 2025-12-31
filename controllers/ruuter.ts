import path from 'path';

import express, { Request, Response } from 'express';
import { parse as parseYmlToJson } from 'yaml';

import { getAllFiles, getUrl, readFile } from '../js/util';

const router = express.Router();

type Service = {
  name: string;
  type: string;
  status: string;
  url: string;
};

type StickyService = Omit<Service, 'name' | 'url'>;

export type ServiceMap = Record<string, StickyService | StickyService[]>;

router.get('/list', (_req: Request, res: Response) => {
  const services: Service[] = [];

  getAllFiles('/Ruuter')
    .filter((filename) => filename.endsWith('.yml'))
    .map(path.parse)
    .forEach(({ name, dir }) => {
      const type = dir.includes('/POST/') ? 'POST' : 'GET';
      const status = dir.endsWith('/inactive') ? 'inactive' : 'active';
      const url = getUrl(dir);
      services.push({ name, type, status, url });
    });

  return res.status(200).json(services);
});

router.get('/sticky', (_req: Request, res: Response) => {
  const services: ServiceMap = {};

  getAllFiles('/Ruuter')
    .filter((filename) => filename.includes('/sticky/'))
    .filter((filename) => filename.endsWith('.yml'))
    .map(path.parse)
    .forEach(({ name, dir }) => {
      const type = dir.includes('/POST/') ? 'POST' : 'GET';
      const status = dir.endsWith('/inactive') ? 'inactive' : 'active';
      if (!services[name]) {
        services[name] = { type, status };
      } else if (Array.isArray(services[name])) {
        (services[name] as StickyService[]).push({ type, status });
      } else {
        services[name] = [services[name] as StickyService, { type, status }];
      }
    });

  return res.status(200).json(services);
});

router.post('/sticky/steps', (req: Request<{}, {}, { name: string }>, res: Response) => {
  const file_path = getAllFiles('/Ruuter')
    .filter((filename) => filename.includes('/sticky/'))
    .filter((filename) => filename.endsWith(`/${req.body.name}.yml`))
    .at(0);

  if (!file_path) {
    return res.status(404).json({ message: 'Sticky DSL not found' });
  }

  try {
    const normalizedPath = path.normalize(file_path).replace(/^(\.\.|\.\.[/\\]?)+/, '');
    const ymlFile = readFile(normalizedPath);
    const jsonFile = parseYmlToJson(ymlFile);
    return res.status(200).json(jsonFile);
  } catch (e) {
    console.log(e);
    return res.status(500).send({ message: "Can't read the file" });
  }
});

export default router;
