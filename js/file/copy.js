import fs from 'fs';
import path from 'path';

import { isValidFilePath } from '../util/utils.js';

export default async function copyFile(current_path, new_path) {
  if (!isValidFilePath(current_path) || !isValidFilePath(new_path)) {
    return {
      error: true,
      message: 'path contains illegal characters',
    };
  }

  try {
    fs.mkdirSync(path.dirname(new_path), { recursive: true });
    fs.copyFileSync(current_path, new_path);

    return {
      error: false,
      message: 'File copied successfully',
    };
  } catch (_) {
    return {
      error: true,
      message: 'Unable to copy file',
    };
  }
}
