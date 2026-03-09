import { Factory } from "miragejs";

export default Factory.extend({
  name: (i: number) => `DT${i}`,
  longName: (i: number) => `Document Type ${i}`,
  description: "This is a test document type",
});
