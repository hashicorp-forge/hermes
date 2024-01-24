import { Factory } from "miragejs";
// FIXME:
// This is the google person
// EmberData model looks like `{ name, firstName, email, picture }`
export default Factory.extend({
  emailAddresses: (i: number) => [{ value: `user${i + 1}@hashicorp.com` }],
  photos: (i: number) => [{ url: "" }],
});
