import { Factory } from "miragejs";

export default Factory.extend({
  id: 0,
  order: (i) => i,
  title(i) {
    return `Related External Link ${this.id}`;
  },
  url(i) {
    return `https://${this.id}.hashicorp.com`;
  },
});
