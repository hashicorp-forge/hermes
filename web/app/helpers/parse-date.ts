import { helper } from "@ember/component/helper";
import parseDate from "hermes/utils/parse-date";

export default helper(
  ([time, monthFormat = "short"]: [
    string | number | Date | undefined,
    "short" | "long"
  ]) => {
    return parseDate(time, monthFormat);
  }
);
