import fs from 'fs';
import path from 'path';

export default async function deleteAllThatStartsWith(currentPath, keyword, res) {
  fs.readdir(currentPath, (err, files) => {
    if (err) {
      res.status(500).json({ message: 'Unable to read directory' });
      return;
    }

    const filesToDelete = files.filter((file) => file.startsWith(keyword));

    if (filesToDelete.length === 0) {
      res.status(200).json({ message: 'No files found with the specified prefix' });
      return;
    }

    filesToDelete.forEach((file) => {
      fs.unlink(path.join(currentPath, file), (err) => {
        if (err) {
          console.error(`Unable to delete file: ${file}`);
        } else {
          console.log(`File deleted: ${file}`);
        }
      });
    });

    res.status(201).json({ message: 'Files deleted successfully' });
  });
}
