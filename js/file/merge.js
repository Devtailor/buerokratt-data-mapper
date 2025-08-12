import array from 'lodash';

export default async function merge(body) {
  const { array1, array2, iteratee } = body;

  if (!array1 || !array2) {
    return {
      error: true,
      message: 'Both arrays are required',
      array: [],
    };
  }

  const merged = array.unionBy(array2, array1, iteratee);

  return {
    error: false,
    message: 'Merged Successfully',
    array: merged,
  };
}
