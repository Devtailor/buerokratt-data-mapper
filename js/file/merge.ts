import unionBy from 'lodash/unionBy';

import { MergeRequest } from '../../interfaces';

interface MergeArraysResult<T> {
  error: boolean;
  message: string;
  array: T[];
}

export function merge<T = any>(body: MergeRequest<T>): MergeArraysResult<T> {
  const { array1, array2, iteratee } = body;

  if (!array1 || !array2) {
    return {
      error: true,
      message: 'Both arrays are required',
      array: [],
    };
  }

  const merged = unionBy(array2, array1, iteratee);

  return {
    error: false,
    message: 'Merged Successfully',
    array: merged,
  };
}
