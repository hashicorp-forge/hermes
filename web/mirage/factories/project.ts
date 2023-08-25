import { Factory } from "miragejs";

export default Factory.extend({
  name: (i: number) => `Test Project ${i}`,
  dateCreated: 1,
  dateModified: 1,
  creator: "testuser@example.com",
});
