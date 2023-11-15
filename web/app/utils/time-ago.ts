import parseDate from "./parse-date";
/**
 * A function to return a "time ago" string from timestamps within 24 hours,
 * with older values being formatted like "15 Nov. 1956."
 * Used throughout the app to format document metadata.
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
