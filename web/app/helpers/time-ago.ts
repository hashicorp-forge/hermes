import { helper } from "@ember/component/helper";
import timeAgo from "hermes/utils/time-ago";

export interface TimeAgoHelperSignature {
  Args: {
    Positional: [time: number];
  };
  Return: string;
}

const timeAgoHelper = helper<TimeAgoHelperSignature>(
  ([secondsAgo]: [number]) => {
    return `${timeAgo(secondsAgo)}`;
  }
);

export default timeAgoHelper;

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "time-ago": typeof timeAgoHelper;
  }
}
