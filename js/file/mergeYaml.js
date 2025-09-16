import fs from 'fs';
import path from 'path';

import express from 'express';
import setRateLimit from 'express-rate-limit';
import * as yaml from 'js-yaml';

import { isValidFilePath } from '../util/utils.js';

const router = express.Router();

const rateLimit = setRateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many requests',
  headers: true,
  statusCode: 429,
});

function mergeYamlFiles(dirPath) {
  const mergedDocuments = { version: '3.0' };

  traverseFolder(dirPath, mergedDocuments);

  return yaml.dump(mergedDocuments, { noArrayIndent: true });
}

function traverseFolder(currentPath, mergedDocuments) {
  const normalizedPath = path.normalize(currentPath).replace(/^(\.\.(\/|\\|$))+/, '');

  const items = fs.readdirSync(normalizedPath);

  for (const item of items) {
    const itemPath = path.join(normalizedPath, item);

    if (fs.statSync(itemPath).isFile()) {
      if (['.yaml', '.yml'].includes(path.extname(itemPath).toLowerCase())) {
        const yamlContent = fs.readFileSync(itemPath, 'utf8');
        const parsedYaml = yaml.load(yamlContent);
        if (!parsedYaml) continue;

        mergeYamlObjects(mergedDocuments, parsedYaml);
      }
    } else {
      traverseFolder(itemPath, mergedDocuments);
    }
  }
}

function mergeYamlObjects(mergedDocObj, parsedYamlObj) {
  for (const yamlKey of Object.keys(parsedYamlObj)) {
    if (yamlKey === 'version') {
      continue;
    }

    if (mergedDocObj[yamlKey] === undefined) {
      mergedDocObj[yamlKey] = parsedYamlObj[yamlKey];
    } else {
      mergedDocObj[yamlKey].push(...parsedYamlObj[yamlKey]);
    }
  }
}

router.post('/', rateLimit, (req, res) => {
  if (!isValidFilePath(req.body.file_path)) {
    res.status(400).send('Path contains illegal characters');
    return;
  }

  const mergedYaml = mergeYamlFiles(req.body.file_path);
  res.setHeader('Content-Type', 'text/plain');
  res.send(mergedYaml);
});

export default router;
