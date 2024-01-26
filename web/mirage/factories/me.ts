import { Factory } from "miragejs";
import {
  TEST_USER_EMAIL,
  TEST_USER_NAME,
  TEST_USER_GIVEN_NAME,
} from "../mirage-utils";

export default Factory.extend({
  id: "123456789",
  email: TEST_USER_EMAIL,
  name: TEST_USER_NAME,
  given_name: TEST_USER_GIVEN_NAME,
  picture: "",
  subscriptions: [],
  isLoggedIn: true,
});
