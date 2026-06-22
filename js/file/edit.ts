import { replaceInFile } from 'replace-in-file';

import { FileActionResponse } from '../../interfaces';
import { buildContentFilePath, isValidFilePath } from '../util';

export async function editFile(file_path: string, from: string | RegExp, to: string): Promise<FileActionResponse> {
  if (!isValidFilePath(file_path)) {
    return {
      error: true,
      message: 'File path contains illegal characters',
    };
  }

  if (!from && !to) {
    return {
      error: true,
      message: '"from" & "to" are required',
    };
  }

  try {
    const filepath = buildContentFilePath(file_path);

    await replaceInFile({
      files: filepath,
      from: from,
      to: to,
    });

    return {
      error: false,
      message: 'File edited successfully',
    };
  } catch {
    return {
      error: true,
      message: 'Unable to edit file',
    };
  }
}
