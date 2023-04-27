import { helper } from "@ember/component/helper";
import { HermesDocument } from "hermes/types/document";

export default helper(([document, approverEmail]: [HermesDocument, string]) => {
  if (document.approvedBy) {
    return document.approvedBy.some((email) => email === approverEmail);
  } else {
    return false;
  }
});
