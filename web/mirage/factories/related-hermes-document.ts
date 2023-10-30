import { Factory } from "miragejs";

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
  owners: ["testuser@example.com"],
  ownerPhotos: ["https://placehold.co/100x100"],
});
