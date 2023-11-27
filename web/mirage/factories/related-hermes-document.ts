import { Factory } from "miragejs";

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
});
