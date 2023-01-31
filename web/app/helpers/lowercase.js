import { helper } from "@ember/component/helper";

function lowercase(string) {
  return string.toString().toLowerCase();
}

export default helper(lowercase);
