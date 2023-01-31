import { helper } from "@ember/component/helper";

export default helper(function add([first, second]) {
  const firstInt = parseInt(first);
  const secondInt = parseInt(second);
  return firstInt + secondInt;
});
