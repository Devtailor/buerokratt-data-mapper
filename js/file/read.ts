import fs from 'fs';

import { FileActionResponse } from '../../interfaces';
import { isValidFilePath } from '../util';

export function read(file_path: string): FileActionResponse & { data?: string } {
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
      message: 'file read successfully',
      data: data,
    };
  } catch (error) {
    console.error('Error reading file:', error);
    return {
      error: true,
      message: 'Unable to read file',
    };
  }
}
