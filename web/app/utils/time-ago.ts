import parseDate from "./parse-date";

export enum TimeAgoFormat {
  Short = "short",
  Long = "long",
}
/**
 * A simplified "time" calculation, based on 28-day months.
 * Intended to give a rough estimate of how long something happened.
 * Used by the `time-ago` helper to convert numeric timestamps to strings.
 *
 * TODO: Replace with something more precise.
 */
export default function timeAgo(
  timeInSeconds: number,
  format?: `${TimeAgoFormat}`,
) {
  let secondsLabel = "second";
  let minutesLabel = "minute";
  let hoursLabel = "hour";
  let daysLabel = "day";
  let weeksLabel = "week";

  const useShortFormat = format === TimeAgoFormat.Short;

  if (useShortFormat) {
    secondsLabel = "s";
    minutesLabel = "m";
    hoursLabel = "h";
    daysLabel = "d";
    weeksLabel = "w";
  }

  const maybeSpace = useShortFormat ? "" : " ";
  const maybeAgoLabel = useShortFormat ? "" : "s ago";

  const now = Date.now();
  const before = new Date(timeInSeconds * 1000).getTime();
  const elapsed = now - before;
  const elapsedSeconds = elapsed / 1000;

  if (elapsedSeconds < 2) {
    return "Just now";
  }
  if (elapsedSeconds < 60) {
    return `${
      Math.floor(elapsedSeconds) + maybeSpace + secondsLabel + maybeAgoLabel
    }`;
  }

  const elapsedMinutes = elapsedSeconds / 60;
  if (elapsedMinutes < 2) {
    return `1${+maybeSpace + minutesLabel + maybeAgoLabel}`;
  }
  if (elapsedMinutes < 60) {
    return `${
      Math.floor(elapsedMinutes) + maybeSpace + minutesLabel + maybeAgoLabel
    }`;
  }

  const elapsedHours = elapsedMinutes / 60;
  if (elapsedHours < 2) {
    return `1${maybeSpace + hoursLabel + maybeAgoLabel}`;
  }
  if (elapsedHours < 24) {
    return `${
      Math.floor(elapsedHours) + maybeSpace + hoursLabel + maybeAgoLabel
    }`;
  }

  return parseDate(timeInSeconds * 1000);
}
