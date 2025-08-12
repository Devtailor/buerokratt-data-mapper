import fs from 'fs';

import { isValidFilePath } from '../util/utils.js';

export default async function deleteFile(file_path) {
  if (!isValidFilePath(file_path)) {
    return {
      error: true,
      message: 'File path contains illegal characters',
    };
  }

  try {
    fs.unlinkSync(file_path);

    return {
      error: false,
      message: 'File deleted successfully',
    };
  } catch (_) {
    return {
      error: true,
      message: 'Unable to delete file',
    };
  }
}
