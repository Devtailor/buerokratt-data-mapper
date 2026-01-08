import fs from 'fs';

import { FileActionResponse } from '../../interfaces';
import { buildContentFilePath } from '../util';

export function checkIfFileExists(file_path: string): FileActionResponse {
  if (!file_path) {
    return {
      error: true,
      message: 'Filename is required',
    };
  }

  if (file_path.includes('..')) {
    return {
      error: true,
      message: 'Relative paths are not allowed',
    };
  }

  try {
    const current_path = buildContentFilePath(file_path);
    fs.accessSync(current_path, fs.constants.F_OK);
    return {
      error: false,
      message: 'File Exists',
    };
  } catch {
    console.error('File does not exist:', file_path);
    return {
      error: true,
      message: 'File Does Not Exist',
    };
  }
}
