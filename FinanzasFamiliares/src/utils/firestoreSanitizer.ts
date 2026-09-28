/**
 * Utility to sanitize objects before sending to Firestore.
 * Firestore throws a runtime error if any property value is `undefined`:
 * "Function updateDoc() called with invalid data. Unsupported field value: undefined"
 *
 * This function recursively removes keys with `undefined` values from objects,
 * filters out `undefined` elements from arrays, and preserves valid primitives,
 * dates, arrays, and nested structures.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) {
    return null as any;
  }
  if (data === null || typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as any;
  }
  const cleanObj: Record<string, any> = {};
  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    if (value !== undefined) {
      cleanObj[key] = sanitizeForFirestore(value);
    }
  }
  return cleanObj as T;
}
