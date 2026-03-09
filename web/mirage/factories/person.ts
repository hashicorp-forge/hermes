import { Factory } from "miragejs";
import { TEST_USER_PHOTO } from "../utils";

export default Factory.extend({
  id: (i) => `person-${i}`,
  name: "Foo Bar",
  firstName: "Foo",
  email() {
    return `${this.id}@hashicorp.com`;
  },
  picture: TEST_USER_PHOTO,
});
