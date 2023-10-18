import { Factory } from "miragejs";

// TODO: Improve how this generates IDs.
// We should be able to use the `i` argument to generate IDs,
// but that doesn't work when using `createList` in tests.

export default Factory.extend({
  id: (i) => i,
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
