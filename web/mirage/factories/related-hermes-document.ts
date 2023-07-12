import { Factory } from "miragejs";

export default Factory.extend({
  id: 0,
  sortOrder: (i) => i,
  googleFileID() {
    return `${this.id}`;
  },
  title() {
    return `Related Document ${this.id}`;
  },
  type: "RFC",
  documentNumber() {
    return `LAB-00${this.id}`;
  },
});
