import { helper } from "@ember/component/helper";

function getFirstLetter([string]) {
  if (typeof string === "string") {
    return string.match(/[a-zA-Z]/)[0]
  }
  return null;
}

export default helper(getFirstLetter);
