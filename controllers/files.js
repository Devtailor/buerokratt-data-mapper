import express from "express";
import path from "path";

import checkIfFileExists from "../js/file/exists.js";
import createFile from "../js/file/create.js";
import moveFile from "../js/file/move.js";
import copyFile from "../js/file/copy.js";
import deleteFile from "../js/file/delete.js";
import readFile from "../js/file/read.js";
import readFullFile from "../js/file/read-file.js";
import editFile from "../js/file/edit.js";
import deleteAllThatStartsWith from "../js/file/delete-all-that-starts-with.js";
import deleteAllThatContains from "../js/file/delete-all-that-contains.js";
import moveAllThatStartsWith from "../js/file/move-all-that-starts-with.js";
import merge from "../js/file/merge.js";
import readFileDir from "../js/file/read-file-dir.js";
import { buildContentFilePath } from "../js/util/utils.js";

const router = express.Router();

router.post("/exists", async (req, res) => {
  const result = await checkIfFileExists(req.body.file_path);
  return res.json(result);
});

router.post("/create", async (req, res) => {
  const filepath = buildContentFilePath(req.body.file_path);
  const result = await createFile(filepath, req.body.content);
  return res.status(result.error ? 400 : 200).json(result);
});

router.post("/move", async (req, res) => {
  const filepath = buildContentFilePath(req.body.file_path);
  const newPath = buildContentFilePath(req.body.new_path);
  const result = await moveFile(filepath, newPath);
  return res.status(result.error ? 400 : 200).json(result);
});

router.post("/copy", async (req, res) => {
  const filepath = buildContentFilePath(req.body.file_path);
  const newPath = buildContentFilePath(req.body.new_path);
  const result = await copyFile(filepath, newPath);
  return res.status(result.error ? 400 : 200).json(result);
});

router.post("/delete", async (req, res) => {
  const filepath = buildContentFilePath(req.body.file_path);
  const result = await deleteFile(filepath);
  return res.status(result.error ? 400 : 200).json(result);
});

router.post("/read", async (req, res) => {
  const filepath = buildContentFilePath(req.body.file_path);
  const result = await readFile(filepath);
  return res.status(result.error ? 400 : 200).json(result);
});

router.post("/read-file-dir", async (req, res) => {
  const filepath = buildContentFilePath(req.body.file_path);
  const result = await readFileDir(filepath);
  return res.status(result.error ? 400 : 200).json(result);
});

router.post("/edit", async (req, res) => {
  const result = await editFile(req.body.file_path, req.body.from, req.body.to);
  return res.status(result.error ? 400 : 200).json(result);
});

router.post("/delete-all-that-starts-with", async (req, res) => {
  const filepath = buildContentFilePath(req.body.path);

  // TODO: this sanitization is done to resolve snyk errors,
  // this is actually not needed here according to the implementation logic
  const normalizedKeyWord = path
    .normalize(req.body.keyword)
    .replace(/^(\.\.(\/|\\|$))+/, "");
  await deleteAllThatStartsWith(filepath, normalizedKeyWord, res);
});

router.post("/move-all-that-starts-with", async (req, res) => {
  const filepath = buildContentFilePath(req.body.file_path);
  const newPath = buildContentFilePath(req.body.new_path);
  const format = req.body.format ?? 'tmp';

  // TODO: this sanitization is done to resolve snyk errors,
  // this is actually not needed here according to the implementation logic
  const normalizedKeyWord = path
    .normalize(req.body.keyword)
    .replace(/^(\.\.(\/|\\|$))+/, "");

  await moveAllThatStartsWith(filepath, newPath, normalizedKeyWord, format, res);
});

router.post("/delete-all-that-contains", async (req, res) => {
  const filepath = buildContentFilePath(req.body.path);

  // TODO: this sanitization is done to resolve snyk errors,
  // this is actually not needed here according to the implementation logic
  const normalizedKeyWord = path
    .normalize(req.body.keyword)
    .replace(/^(\.\.(\/|\\|$))+/, "");
  await deleteAllThatContains(filepath, normalizedKeyWord, res);
});

router.post("/read-file", async (req, res) => {
  const filepath = buildContentFilePath(req.body.file_path);
  const result = await readFullFile(filepath);
  res.json(result);
});

router.post("/merge", async (req, res) => {
  const result = await merge(req.body);
  return res.status(result.error ? 400 : 200).json(result);
});

router.post("/delete-intent", async (req, res) => {
  const filepath = buildContentFilePath(req.body.file_path);
  const result = await deleteFile(filepath);
  return res.status(result.error ? 400 : 200).json(result);
});

export default router;
