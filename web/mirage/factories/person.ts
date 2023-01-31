import { Factory } from "miragejs";

export default Factory.extend({
  emailAddresses: (i: number) => [{ value: `user${i + 1}@hashicorp.com` }],
  photos: (i: number) => [{ url: "" }],
});
