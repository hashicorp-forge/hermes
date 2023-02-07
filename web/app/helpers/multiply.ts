import { helper } from "@ember/component/helper";

export default helper(function multiply([first, second]: [number, number]) {
  return first * second;
});
