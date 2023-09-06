import { helper } from "@ember/component/helper";
import timeAgo from "hermes/utils/time-ago";

export interface TimeAgoHelperSignature {
  Args: {
    Positional: [time: number];
  };
  Return: string;
}

const timeAgoHelper = helper<TimeAgoHelperSignature>(([time]: [number]) => {
  // if the time is in seconds, convert to milliseconds
  if (time < 10000000000) {
    time = time * 1000;
  }
  return `${timeAgo(time)}`;
});

export default timeAgoHelper;

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "time-ago": typeof timeAgoHelper;
  }
}
