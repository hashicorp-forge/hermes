import { Factory } from "miragejs";
import { TEST_USER_EMAIL } from "hermes/utils/mirage-utils";

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
  ownerPhotos: [],
  product: "Vault",
  status: "In-Review",
  summary() {
    return `Summary for ${this.title}`;
  },
});
