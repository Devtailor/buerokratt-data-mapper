import fs from 'fs';

import mime from 'mime-types';

export function readFile(file_path: string): Promise<{ name: string; file: string; mimeType?: string }> {
  return new Promise((resolve, reject) => {
    if (!file_path) return reject(new Error('File path is required'));
    if (file_path.includes('..')) return reject(new Error('Relative paths are not allowed'));

    const mimeType = mime.lookup(file_path) || undefined;
    const name = file_path.split(/[\\/]/g).pop() || '';

    fs.readFile(file_path, 'utf8', (err, data) => {
      if (err) return reject(new Error('File not found'));
      const file = Buffer.from(data).toString('base64');
      resolve({ name, file, mimeType });
    });
  });
}
