import fs from 'fs';

import { FileActionResponse } from '../../interfaces';
import { isValidFilePath } from '../util';

export function createFile(file_path: string, content: string): FileActionResponse {
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
  } catch (error) {
    console.error('Error creating file:', error);
    return {
      error: true,
      message: 'Unable to create file',
    };
  }
}
