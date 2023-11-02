import parseDate from "./parse-date";
/**
 * A simplified "time ago" calculation, based on 28-day months.
 * Intended to give a rough estimate of how long ago something happened.
 * Used by the `time-ago` helper to convert numeric timestamps to strings.
 *
 * TODO: Replace with something more precise.
 */
export default function timeAgo(timeInSeconds: number) {
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

  return parseDate(timeInSeconds * 1000);
}
