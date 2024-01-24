import { Factory } from "miragejs";
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
});
