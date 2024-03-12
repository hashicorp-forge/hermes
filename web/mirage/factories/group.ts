import { Factory } from "miragejs";

export default Factory.extend({
  name: (i: number) => `Group ${i}`,
  email: (i: number) => `group-${i}@hashicorp.com`,
  // TODO: `directMembersCount` in the `afterCreate` hook
});
