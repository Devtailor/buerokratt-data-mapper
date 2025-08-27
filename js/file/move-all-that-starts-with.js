import fs from 'fs';
import path from 'path';

export default async function moveAllThatStartsWith(currentPath, newPath, keyword, format, res) {
  fs.readdir(currentPath, (err, files) => {
    if (err) {
      res.status(500).json({ message: 'Unable to read directory' });
      return;
    }

    const filesToMove = files.filter((file) => file.startsWith(keyword));

    if (filesToMove.length === 0) {
      res.status(200).json({ message: 'No files found with the specified prefix' });
      return;
    }

    filesToMove.forEach((file) => {
      const oldFilePath = `${currentPath}/${file}`;
      const fileNameWithoutExt = path.parse(file).name;
      const newFileName = `${fileNameWithoutExt}.${format}`;
      const newFilePath = `${newPath}/${newFileName}`;
      fs.renameSync(oldFilePath, newFilePath, (err) => {
        if (err) {
          console.error(`Unable to move file: ${file}`);
        } else {
          console.log(`File moved: ${file}`);
        }
      });
    });

    res.status(201).json({ message: 'Files moved successfully' });
  });
}
