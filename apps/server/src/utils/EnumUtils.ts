/**
 * Loops thru each enum key and set initial value. Only works if SAME initial value applies to all keys.
 * @param enumObj type of enum you want to set initial values to
 * @param initialValue
 * @returns Object with initial value for each key
 */
export function initializeEnumKeys<E extends {}, V>(enumObj: E, initialValue: V): Record<keyof E, V> {
  const initializedEnum: any = {};
  Object.keys(enumObj).forEach((key) => {
    initializedEnum[key] = initialValue;
  });

  return initializedEnum as Record<keyof E, V>;
}
