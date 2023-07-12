import { Factory } from "miragejs";

export default Factory.extend({
  id: 0,
  sortOrder: (i) => i,
  name() {
    return `Related External Link ${this.id}`;
  },
  url() {
    return `https://${this.id}.hashicorp.com`;
  },
});
