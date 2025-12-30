import path from "path";

import express, { Request, Response } from "express";

import { MergeRequest } from "../interfaces";
import {
  checkIfFileExists,
  copyFile,
  createFile,
  deleteAllThatContains,
  deleteAllThatStartsWith,
  deleteFile,
  editFile,
  merge,
  moveAllThatStartsWith,
  moveFile,
  read,
  readFile,
  readFileDir,
} from "../js/file";
import { buildContentFilePath } from "../js/util";

const router = express.Router();

router.post("/exists", (req: Request<{}, {}, { file_path: string }>, res: Response) => {
  const result = checkIfFileExists(req.body.file_path);
  return res.json(result);
});

router.post("/create", (req: Request<{}, {}, { file_path: string; content: string }>, res: Response) => {
  const { file_path, content } = req.body;

  const filepath = buildContentFilePath(file_path);
  const result = createFile(filepath, content);
  return res.status(result.error ? 400 : 200).json(result);
});

router.post("/move", (req: Request<{}, {}, { file_path: string; new_path: string }>, res: Response) => {
  const { file_path, new_path } = req.body;

  const filepath = buildContentFilePath(file_path);
  const newPath = buildContentFilePath(new_path);

  if (filepath === newPath) {
    return res.status(200).json({ message: "File is already there" });
  } else {
    const result = moveFile(filepath, newPath);
    return res.status(result.error ? 400 : 200).json(result);
  }
});

router.post("/copy", (req: Request<{}, {}, { file_path: string; new_path: string }>, res: Response) => {
  const { file_path, new_path } = req.body;

  const filepath = buildContentFilePath(file_path);
  const newPath = buildContentFilePath(new_path);
  const result = copyFile(filepath, newPath);
  return res.status(result.error ? 400 : 200).json(result);
});

router.post("/delete", (req: Request<{}, {}, { file_path: string }>, res: Response) => {
  const filepath = buildContentFilePath(req.body.file_path);
  const result = deleteFile(filepath);
  return res.status(result.error ? 400 : 200).json(result);
});

router.post("/read", (req: Request<{}, {}, { file_path: string }>, res: Response) => {
  const filepath = buildContentFilePath(req.body.file_path);
  const result = read(filepath);
  return res.status(result.error ? 400 : 200).json(result);
});

router.post("/read-file-dir", (req: Request<{}, {}, { file_path: string }>, res: Response) => {
  const filepath = buildContentFilePath(req.body.file_path);
  const result = readFileDir(filepath);
  return res.status(result.error ? 400 : 200).json(result);
});

router.post(
  "/edit",
  async (req: Request<{}, {}, { file_path: string; from: string | RegExp; to: string }>, res: Response) => {
    const { file_path, from, to } = req.body;

    const result = await editFile(file_path, from, to);
    return res.status(result.error ? 400 : 200).json(result);
  },
);

router.post(
  "/delete-all-that-starts-with",
  async (req: Request<{}, {}, { path: string; keyword: string }>, res: Response) => {
    const { path, keyword } = req.body;

    const filepath = buildContentFilePath(path);
    // This sanitization is done to resolve snyk errors,
    // this is actually not needed here according to the implementation logic
    const normalizedKeyWord = path.normalize(keyword).replace(/^(\.\.|\.\.[/\\]?)+/, "");
    await deleteAllThatStartsWith(filepath, normalizedKeyWord, res);
  },
);

router.post(
  "/move-all-that-starts-with",
  async (
    req: Request<{}, {}, { file_path: string; new_path: string; keyword: string; format?: string }>,
    res: Response,
  ) => {
    const { file_path, new_path, keyword, format } = req.body;

    const filepath = buildContentFilePath(file_path);
    const newPath = buildContentFilePath(new_path);
    // This sanitization is done to resolve snyk errors,
    // this is actually not needed here according to the implementation logic
    const normalizedKeyWord = path.normalize(keyword).replace(/^(\.\.|\.\.[/\\]?)+/, "");
    await moveAllThatStartsWith(filepath, newPath, normalizedKeyWord, format ?? "tmp", res);
  },
);

router.post(
  "/delete-all-that-contains",
  async (req: Request<{}, {}, { path: string; keyword: string }>, res: Response) => {
    const { path, keyword } = req.body;

    const filepath = buildContentFilePath(path);
    // This sanitization is done to resolve snyk errors,
    // this is actually not needed here according to the implementation logic
    const normalizedKeyWord = path.normalize(keyword).replace(/^(\.\.|\.\.[/\\]?)+/, "");
    await deleteAllThatContains(filepath, normalizedKeyWord, res);
  },
);

router.post("/read-file", async (req: Request<{}, {}, { file_path: string }>, res: Response) => {
  const filepath = buildContentFilePath(req.body.file_path);

  try {
    const result = await readFile(filepath);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/merge", (req: Request<{}, {}, MergeRequest<any>>, res: Response) => {
  const result = merge(req.body);
  return res.status(result.error ? 400 : 200).json(result);
});

router.post("/delete-intent", (req: Request<{}, {}, { file_path: string }>, res: Response) => {
  const filepath = buildContentFilePath(req.body.file_path);
  const result = deleteFile(filepath);
  return res.status(result.error ? 400 : 200).json(result);
});

export default router;
