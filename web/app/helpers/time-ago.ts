import { helper } from "@ember/component/helper";
import timeAgo, { TimeAgoFormat } from "hermes/utils/time-ago";

export interface TimeAgoHelperSignature {
  Args: {
    Positional: [time: number, format?: `${TimeAgoFormat}`];
  };
  Return: string | null;
}

const timeAgoHelper = helper<TimeAgoHelperSignature>(([time, format]) => {
  return timeAgo(time, format);
});

export default timeAgoHelper;

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "time-ago": typeof timeAgoHelper;
  }
}
