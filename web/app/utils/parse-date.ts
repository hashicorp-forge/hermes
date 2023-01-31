/**
 * Converts a valid Date/timestamp into a "MM/DD/YYYY"-formatted string.
 * Returns null if the time parameter is invalid.
 */

export default function parseDate(
  time?: string | number | Date
): string | null {
  if (!time) {
    return null;
  }
  const date = new Date(time);

  // `getMonth()` returns a zero-indexed month so we add 1
  let month = date.getMonth() + 1;
  let day = date.getDate();
  let year = date.getFullYear();

  // Nullify invalid timestamps
  if (isNaN(month) || isNaN(day) || isNaN(year)) {
    return null;
  }

  return `${month}/${day}/${year}`;
}
