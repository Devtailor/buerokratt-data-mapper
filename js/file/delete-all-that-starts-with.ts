import fs from "fs/promises";
import path from "path";

import { Response } from "express";

export async function deleteAllThatStartsWith(currentPath: string, keyword: string, res: Response): Promise<void> {
  try {
    const files = await fs.readdir(currentPath);
    const filesToDelete = files.filter((file) => file.startsWith(keyword));

    if (filesToDelete.length === 0) {
      res.status(200).json({ message: "No files found with the specified prefix" });
      return;
    }

    await Promise.all(
      filesToDelete.map(async (file) => {
        try {
          await fs.unlink(path.join(currentPath, file));
        } catch (err) {
          console.error(`Unable to delete file: ${file}`, err);
        }
      }),
    );

    res.status(201).json({ message: "Files deleted successfully" });
  } catch (err) {
    console.error("Unable to read directory", err);
    res.status(500).json({ message: "Unable to read directory" });
  }
}
