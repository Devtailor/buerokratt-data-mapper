export interface MergeRequest<T> {
  array1?: T[];
  array2?: T[];
  iteratee?: string | ((item: T) => unknown);
}
