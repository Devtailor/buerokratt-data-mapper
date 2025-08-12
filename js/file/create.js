import fs from 'fs';

import { isValidFilePath } from '../util/utils.js';

export default async function createFile(file_path, content) {
  if (!isValidFilePath(file_path)) {
    return {
      error: true,
      message: 'File path contains illegal characters',
    };
  }

  if (!file_path || !content) {
    return {
      error: true,
      message: 'File path and content are required',
    };
  }

  try {
    fs.writeFileSync(file_path, content);

    return {
      error: false,
      message: 'File created successfully',
    };
  } catch (_) {
    return {
      error: true,
      message: 'Unable to create file',
    };
  }
}
