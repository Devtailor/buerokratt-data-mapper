import fs from 'fs/promises';
import path from 'path';

import { Response } from 'express';

export async function moveAllThatStartsWith(
  currentPath: string,
  newPath: string,
  keyword: string,
  format: string,
  res: Response,
): Promise<void> {
  try {
    const files = await fs.readdir(currentPath);
    const filesToMove = files.filter((file) => file.startsWith(keyword));

    if (filesToMove.length === 0) {
      res.status(200).json({ message: 'No files found with the specified prefix' });
      return;
    }

    await Promise.all(
      filesToMove.map(async (file) => {
        const oldFilePath = path.join(currentPath, file);
        const fileNameWithoutExt = path.parse(file).name;
        const newFileName = `${fileNameWithoutExt}.${format}`;
        const newFilePath = path.join(newPath, newFileName);

        try {
          await fs.rename(oldFilePath, newFilePath);
          console.log(`File moved: ${file}`);
        } catch (error) {
          console.error(`Unable to move file: ${file}`, error);
        }
      }),
    );

    res.status(201).json({ message: 'Files moved successfully' });
  } catch (err) {
    console.error('Unable to read directory:', err);
    res.status(500).json({ message: 'Unable to read directory' });
  }
}
