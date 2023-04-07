import { helper } from "@ember/component/helper";
import htmlElement from "hermes/utils/html-element";

export default helper(([selector]: [string]) => {
  return htmlElement(selector);
});
