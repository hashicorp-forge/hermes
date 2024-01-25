import { Factory, ModelInstance } from "miragejs";
import {
  TEST_USER_EMAIL,
  TEST_USER_NAME,
  TEST_USER_GIVEN_NAME,
} from "hermes/utils/mirage-utils";

export default Factory.extend({
  id: TEST_USER_EMAIL,
  email: TEST_USER_EMAIL,
  name: TEST_USER_NAME,

  /**
   * This gets serialized into `firstName`.
   */
  given_name: TEST_USER_GIVEN_NAME,

  picture: "",
  subscriptions: [],
  isLoggedIn: true,

  // @ts-ignore - Bug https://github.com/miragejs/miragejs/issues/1052
  afterCreate(me: any, server: any): void {
    // Also create a `person` record for the user.
    const { id, email, name, picture, given_name } = me.attrs;
    const isDuplicate = server.schema.people.find({ id });

    if (isDuplicate) return;

    server.create("person", {
      id,
      email,
      name,
      firstName: given_name,
      picture,
    });
  },
});
