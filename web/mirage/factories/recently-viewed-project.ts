import { Factory } from "miragejs";

export default Factory.extend({
  id: (i: number) => i,
  viewedTime: 1,
});
