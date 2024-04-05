import parseDate from "./parse-date";
/**
 * Returns a "time ago" string from a seconds-based timestamp.
 * If set, the `limitTo24Hours` option will use the short `parseDate`
 * formatting. e.g., "22 Dec. 1976," for values older than a day.
 * Used throughout the app to format document metadata.
 */
export default function timeAgo(
  timeInSeconds?: number,
  options?: {
    limitTo24Hours?: boolean;
  },
) {
  if (!timeInSeconds) return "Unknown date";

  const now = Date.now();
  const before = new Date(timeInSeconds * 1000).getTime();
  const elapsed = now - before;
  const elapsedSeconds = elapsed / 1000;

  if (elapsedSeconds < 2) {
    return "1 second ago";
  }

  if (elapsedSeconds < 60) {
    return `${Math.floor(elapsedSeconds)} seconds ago`;
  }

  const elapsedMinutes = elapsedSeconds / 60;

  if (elapsedMinutes < 2) {
    return "1 minute ago";
  }

  if (elapsedMinutes < 60) {
    return `${Math.floor(elapsedMinutes)} minutes ago`;
  }

  const elapsedHours = elapsedMinutes / 60;

  if (elapsedHours < 2) {
    return "1 hour ago";
  }

  if (elapsedHours < 24) {
    return `${Math.floor(elapsedHours)} hours ago`;
  }

  if (options?.limitTo24Hours) {
    return parseDate(timeInSeconds * 1000);
  }

  const elapsedDays = elapsedHours / 24;

  if (elapsedDays < 2) {
    return "1 day ago";
  }

  if (elapsedDays < 30) {
    return `${Math.floor(elapsedDays)} days ago`;
  }

  const elapsedWeeks = elapsedDays / 7;

  if (elapsedWeeks < 2) {
    return "1 week ago";
  }

  if (elapsedWeeks < 4) {
    return `${Math.floor(elapsedWeeks)} weeks ago`;
  }

  const elapsedMonths = elapsedWeeks / 4;

  if (elapsedMonths < 2) {
    return "1 month ago";
  }

  if (elapsedMonths < 12) {
    return `${Math.floor(elapsedMonths)} months ago`;
  }

  const elapsedYears = elapsedMonths / 12;

  if (elapsedYears < 2) {
    return "1 year ago";
  }

  return `${Math.floor(elapsedYears)} years ago`;
}
