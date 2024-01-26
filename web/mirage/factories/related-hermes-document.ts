import { Factory } from "miragejs";
import { TEST_USER_EMAIL, TEST_USER_PHOTO } from "../mirage-utils";

export default Factory.extend({
  id: (i) => `doc-${i}`,
  sortOrder: (i) => i,
  googleFileID() {
    return `${this.id}`;
  },
  title() {
    return `Related Document ${this.id}`;
  },
  documentType: "RFC",
  documentNumber() {
    return `LAB-00${this.id}`;
  },
  owners: [TEST_USER_EMAIL],
  ownerPhotos: [TEST_USER_PHOTO],
  product: "Vault",
  status: "In-Review",
  summary() {
    return `Summary for ${this.title}`;
  },
});
