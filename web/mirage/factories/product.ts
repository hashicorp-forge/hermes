import { Factory } from "miragejs";

export default Factory.extend({
  name: (i: number) => `Test Product ${i}`,
  abbreviation: (i: number) => `TP${i}`,
});
