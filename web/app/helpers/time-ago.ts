import { helper } from "@ember/component/helper";
import timeAgo from "hermes/utils/time-ago";

export interface TimeAgoHelperSignature {
  Args: {
    Positional: [time: number];
    Named: {
      limitTo24Hours?: boolean;
      hideYear?: boolean;
    };
  };
  Return: string | null;
}

const timeAgoHelper = helper<TimeAgoHelperSignature>(
  ([time], { limitTo24Hours, hideYear }) => {
    return timeAgo(time, { limitTo24Hours, hideYear });
  },
);

export default timeAgoHelper;

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "time-ago": typeof timeAgoHelper;
  }
}
