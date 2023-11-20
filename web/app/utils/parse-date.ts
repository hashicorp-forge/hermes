/**
 * Converts a valid Date/timestamp into a string formatted like
 * "21 Dec. 2023" or "21 December 2023" (if monthFormat is "long").
 * Returns null if the time parameter is invalid.
 */
export default function parseDate(
  time?: string | number | Date,
  monthFormat: "short" | "long" = "short",
): string | null {
  if (!time) {
    return null;
  }
  const date = new Date(time);

  if (isNaN(date.getTime())) {
    return null;
  }

  let day = date.getDate();
  let year = date.getFullYear();
  let month = date.toLocaleString("default", { month: monthFormat });

  if (monthFormat === "short") {
    month += ".";
  }

  return `${day} ${month} ${year}`;
}
