import fs from 'fs';

import { isValidFilePath } from '../util/utils.js';

export default async function readFile(file_path) {
  if (!isValidFilePath(file_path)) {
    return {
      error: true,
      message: 'File name contains illegal characters',
    };
  }

  try {
    const data = fs.readFileSync(file_path, { encoding: 'utf8', flag: 'r' });

    return {
      error: false,
      message: 'file readed successfully',
      data: data,
    };
  } catch (_) {
    return {
      error: true,
      message: 'Unable to read file',
    };
  }
}
