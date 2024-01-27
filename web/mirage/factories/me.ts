import { Factory, ModelInstance } from "miragejs";
import {
  TEST_USER_EMAIL,
  TEST_USER_NAME,
  TEST_USER_GIVEN_NAME,
  TEST_USER_PHOTO,
} from "../utils";

export default Factory.extend({
  id: TEST_USER_EMAIL,
  subscriptions: [],
  isLoggedIn: true, // Mirage-only attribute

  // these are part of the back-end response for `me`
  email: TEST_USER_EMAIL,
  name: TEST_USER_NAME,
  given_name: TEST_USER_GIVEN_NAME,
  picture: TEST_USER_PHOTO,
});
