import fs from "fs";
import path from "path";

import express, { Request, Response } from "express";
import setRateLimit from "express-rate-limit";
import * as yaml from "js-yaml";

import { isValidFilePath } from "../util";

const router = express.Router();

const rateLimit = setRateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: "Too many requests",
  headers: true,
  statusCode: 429,
});

function mergeYamlFiles(dirPath: string): string {
  const mergedDocuments: Record<string, any> = { version: "3.0" };
  traverseFolder(dirPath, mergedDocuments);
  return yaml.dump(mergedDocuments, { noArrayIndent: true });
}

function traverseFolder(currentPath: string, mergedDocuments: Record<string, any>): void {
  const normalizedPath = path.normalize(currentPath).replace(/^(\.\.|\.\.[/\\]?)+/, "");
  const items = fs.readdirSync(normalizedPath);

  for (const item of items) {
    const itemPath = path.join(normalizedPath, item);
    if (fs.statSync(itemPath).isFile()) {
      if ([".yaml", ".yml"].includes(path.extname(itemPath).toLowerCase())) {
        const yamlContent = fs.readFileSync(itemPath, "utf8");
        const parsedYaml = yaml.load(yamlContent);
        if (!parsedYaml) continue;

        mergeYamlObjects(mergedDocuments, parsedYaml as Record<string, any>);
      }
    } else {
      traverseFolder(itemPath, mergedDocuments);
    }
  }
}

function mergeYamlObjects(mergedDocObj: Record<string, any>, parsedYamlObj: Record<string, any>): void {
  for (const yamlKey of Object.keys(parsedYamlObj)) {
    if (yamlKey === "version") {
      continue;
    }
    if (mergedDocObj[yamlKey] === undefined) {
      mergedDocObj[yamlKey] = parsedYamlObj[yamlKey];
    } else {
      mergedDocObj[yamlKey].push(...(parsedYamlObj[yamlKey] as unknown[]));
    }
  }
}

router.post("/", rateLimit, (req: Request, res: Response) => {
  const filePath = req.body.file_path;

  if (typeof filePath !== "string" || !isValidFilePath(filePath)) {
    res.status(400).send("Path contains illegal characters");
    return;
  }

  const mergedYaml = mergeYamlFiles(filePath);
  res.setHeader("Content-Type", "text/plain");
  res.send(mergedYaml);
});

export default router;
