import fs from 'fs';

import { FileActionResponse } from '../../interfaces';
import { isValidFilePath } from '../util';

export function deleteFile(file_path: string): FileActionResponse {
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
  } catch (error) {
    console.error('Error deleting file:', error);
    return {
      error: true,
      message: 'Unable to delete file',
    };
  }
}
