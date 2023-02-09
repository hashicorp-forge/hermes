import { Factory } from "miragejs";

export default Factory.extend({
  id: (i: number) => `doc-${i}`,
  objectID: (i: number) => `doc-${i}`,
});
