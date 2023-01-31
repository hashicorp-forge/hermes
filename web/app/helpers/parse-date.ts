import { helper } from "@ember/component/helper";
import parseDate from "hermes/utils/parse-date";

export default helper(([time]: [string | number | Date | undefined]) => {
  return parseDate(time);
});
