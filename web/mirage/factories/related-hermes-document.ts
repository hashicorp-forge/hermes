import { Factory } from "miragejs";
import { TEST_USER_EMAIL } from "hermes/utils/mirage-utils";

export default Factory.extend({
  id: (i) => `${i}`,
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
  status: "In review",
  product: "Labs",
  owners: [TEST_USER_EMAIL],
  ownerPhotos: ["https://placehold.co/100x100"],
});
