import path from 'path';

import express from 'express';
import { parse as parseYmlToJson } from 'yaml';

import { getAllFiles, getUrl, readFile } from '../js/util/utils.js';

const router = express.Router();

router.get('/list', (req, res) => {
  const services = [];

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

router.get('/sticky', (req, res) => {
  const services = {};

  getAllFiles('/Ruuter')
    .filter((filename) => filename.includes('/sticky/'))
    .filter((filename) => filename.endsWith('.yml'))
    .map(path.parse)
    .forEach(({ name, dir }) => {
      const type = dir.includes('/POST/') ? 'POST' : 'GET';
      const status = dir.endsWith('/inactive') ? 'inactive' : 'active';
      if (!services[name]) {
        services[name] = { type, status };
      } else if (services[name].length > 1) {
        services[name] = [...services[name], { type, status }];
      } else {
        services[name] = [{ ...services[name] }, { type, status }];
      }
    });

  return res.status(200).json(services);
});

router.post('/sticky/steps', (req, res) => {
  const name = req.body.name;

  const file_path = getAllFiles('/Ruuter')
    .filter((filename) => filename.includes('/sticky/'))
    .filter((filename) => filename.endsWith(`/${name}.yml`))
    .at(0);

  if (!file_path) {
    return res.status(404).json({ message: 'Sticky DSL not found' });
  }

  try {
    const normalizedPath = path.normalize(file_path).replace(/^(\.\.(\/|\\|$))+/, '');

    const ymlFile = readFile(normalizedPath);
    const jsonFile = parseYmlToJson(ymlFile);
    return res.status(200).json(jsonFile);
  } catch (e) {
    console.log(e);
    return res.status(500).send({ message: "Can't read the file" });
  }
});

export default router;
