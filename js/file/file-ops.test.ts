import fs from "fs";
import path from "path";

import { Response } from "express";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  checkIfFileExists,
  copyFile,
  createFile,
  deleteAllThatContains,
  deleteAllThatStartsWith,
  deleteFile,
  editFile,
  moveAllThatStartsWith,
  moveFile,
  read,
  readFile,
  readFileDir,
} from "./";

const tempDir = path.join("data");
const fileA = path.join(tempDir, "a.txt");
const fileB = path.join(tempDir, "b.txt");
const fileC = path.join(tempDir, "c.txt");

function cleanup(): void {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

type MockResponse = Response & {
  statusCode: number;
  body: any;
};

function createMockResponse(): MockResponse {
  const res: Partial<Response> & { statusCode: number; body: any } = {
    statusCode: 0,
    body: null,

    // Must explicitly return Response to satisfy Express types
    status(code: number) {
      this.statusCode = code;
      return this as unknown as Response;
    },

    json(body: any) {
      this.body = body;
      return this as unknown as Response;
    },
  };

  return res as MockResponse;
}

describe("File Operations", () => {
  beforeEach(() => {
    cleanup();
    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(fileA, "hello world");
  });

  afterEach(() => {
    cleanup();
  });

  it("createFile creates a file", () => {
    const result = createFile(fileB, "test content");
    expect(result.error).toBe(false);
    expect(fs.readFileSync(fileB, "utf8")).toBe("test content");
  });

  it("copyFile copies a file", () => {
    const result = copyFile(fileA, fileB);
    expect(result.error).toBe(false);
    expect(fs.readFileSync(fileB, "utf8")).toBe("hello world");
  });

  it("editFile edits a file", async () => {
    // Needs to be relative path to match the implementation
    const result = await editFile("a.txt", "hello", "hi");
    expect(result.error).toBe(false);
    expect(fs.readFileSync(fileA, "utf8")).toBe("hi world");
  });

  it("checkIfFileExists returns true for existing file", () => {
    // Needs to be relative path to match the implementation
    const result = checkIfFileExists("a.txt");
    expect(result.error).toBe(false);
    expect(result.message).toMatch(/File Exists/);
  });

  it("checkIfFileExists returns false for missing file", () => {
    const result = checkIfFileExists(fileC);
    expect(result.error).toBe(true);
    expect(result.message).toMatch(/Does Not Exist/);
  });

  it("moveFile moves a file", () => {
    const result = moveFile(fileA, fileB);
    expect(result.error).toBe(false);
    expect(fs.existsSync(fileA)).toBe(false);
    expect(fs.existsSync(fileB)).toBe(true);
    expect(fs.readFileSync(fileB, "utf8")).toBe("hello world");
  });

  it("deleteFile deletes a file", () => {
    const result = deleteFile(fileA);
    expect(result.error).toBe(false);
    expect(fs.existsSync(fileA)).toBe(false);
  });

  it("readFileDir lists files in directory", () => {
    fs.writeFileSync(fileB, "foo");
    const result = readFileDir(tempDir);
    expect(result.error).toBe(false);
    expect(result.data).toContain("a.txt");
    expect(result.data).toContain("b.txt");
  });

  it("readFile reads file and returns base64", async () => {
    const result = await readFile(fileA);
    expect(result.name).toBe("a.txt");
    expect(Buffer.from(result.file, "base64").toString("utf8")).toBe("hello world");
    expect(result.mimeType).toBe("text/plain");
  });

  it("read reads file and returns content", () => {
    const result = read(fileA);
    expect(result.error).toBe(false);
    expect(result.data).toBe("hello world");
  });

  describe("Express-based batch operations", () => {
    it("deleteAllThatContains deletes files containing keyword", async () => {
      const file1 = path.join(tempDir, "foo-key.txt");
      const file2 = path.join(tempDir, "bar-key.txt");
      const file3 = path.join(tempDir, "baz.txt");
      fs.writeFileSync(file1, "1");
      fs.writeFileSync(file2, "2");
      fs.writeFileSync(file3, "3");
      const res = createMockResponse();
      await deleteAllThatContains(tempDir, "key", res);
      expect(res.statusCode).toBe(201);
      expect(res.body.message).toMatch(/deleted successfully/);
      expect(fs.existsSync(file1)).toBe(false);
      expect(fs.existsSync(file2)).toBe(false);
      expect(fs.existsSync(file3)).toBe(true);
    });

    it("deleteAllThatStartsWith deletes files with prefix", async () => {
      const file1 = path.join(tempDir, "start-foo.txt");
      const file2 = path.join(tempDir, "start-bar.txt");
      const file3 = path.join(tempDir, "baz.txt");
      fs.writeFileSync(file1, "1");
      fs.writeFileSync(file2, "2");
      fs.writeFileSync(file3, "3");
      const res = createMockResponse();
      await deleteAllThatStartsWith(tempDir, "start-", res);
      expect(res.statusCode).toBe(201);
      expect(res.body.message).toMatch(/deleted successfully/);
      expect(fs.existsSync(file1)).toBe(false);
      expect(fs.existsSync(file2)).toBe(false);
      expect(fs.existsSync(file3)).toBe(true);
    });

    it("moveAllThatStartsWith moves files with prefix and changes extension", async () => {
      const srcFile1 = path.join(tempDir, "move-foo.txt");
      const srcFile2 = path.join(tempDir, "move-bar.txt");
      const srcFile3 = path.join(tempDir, "baz.txt");
      fs.writeFileSync(srcFile1, "1");
      fs.writeFileSync(srcFile2, "2");
      fs.writeFileSync(srcFile3, "3");
      const destDir = path.join(tempDir, "dest");
      fs.mkdirSync(destDir, { recursive: true });
      const res = createMockResponse();
      await moveAllThatStartsWith(tempDir, destDir, "move-", "md", res);
      expect(res.statusCode).toBe(201);
      expect(res.body.message).toMatch(/moved successfully/);
      // Check moved files
      expect(fs.existsSync(path.join(destDir, "move-foo.md"))).toBe(true);
      expect(fs.existsSync(path.join(destDir, "move-bar.md"))).toBe(true);
      // Original files gone
      expect(fs.existsSync(srcFile1)).toBe(false);
      expect(fs.existsSync(srcFile2)).toBe(false);
      // Unaffected file remains
      expect(fs.existsSync(srcFile3)).toBe(true);
    });
  });
});
