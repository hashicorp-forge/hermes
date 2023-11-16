import parseDate from "./parse-date";
/**
 * Returns a "time ago" string from a seconds-based timestamp.
 * If set, the `limitTo24Hours` option will use the short `parseDate`
 * formatting. e.g., "22 Dec. 1976," for values older than a day.
 * Used throughout the app to format document metadata.
 */
export default function timeAgo(
  timeInSeconds: number,
  options?: {
    limitTo24Hours?: boolean;
  },
) {
  const now = Date.now();
  const before = new Date(timeInSeconds * 1000).getTime();
  const elapsed = now - before;
  const elapsedSeconds = elapsed / 1000;

  if (elapsedSeconds < 2) {
    return "1s";
  }

  if (elapsedSeconds < 60) {
    return `${Math.floor(elapsedSeconds)}s`;
  }

  const elapsedMinutes = elapsedSeconds / 60;

  if (elapsedMinutes < 2) {
    return "1m";
  }

  if (elapsedMinutes < 60) {
    return `${Math.floor(elapsedMinutes)}m`;
  }

  const elapsedHours = elapsedMinutes / 60;

  if (elapsedHours < 2) {
    return "1h";
  }

  if (elapsedHours < 24) {
    return `${Math.floor(elapsedHours)}h`;
  }

  if (options?.limitTo24Hours) {
    return parseDate(timeInSeconds * 1000);
  }

  const elapsedDays = elapsedHours / 24;

  if (elapsedDays < 2) {
    return "1d";
  }

  if (elapsedDays < 30) {
    return `${Math.floor(elapsedDays)}d`;
  }

  const elapsedWeeks = elapsedDays / 7;

  if (elapsedWeeks < 2) {
    return "1w";
  }

  if (elapsedWeeks < 4) {
    return `${Math.floor(elapsedWeeks)}w`;
  }

  const elapsedMonths = elapsedWeeks / 4;

  if (elapsedMonths < 2) {
    return "1mo";
  }

  if (elapsedMonths < 12) {
    return `${Math.floor(elapsedMonths)}mos`;
  }

  const elapsedYears = elapsedMonths / 12;

  if (elapsedYears < 2) {
    return "1y";
  }

  return `${Math.floor(elapsedYears)} years ago`;
}
