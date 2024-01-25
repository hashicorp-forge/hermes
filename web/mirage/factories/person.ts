import { Factory } from "miragejs";
import {
  TEST_USER_EMAIL,
  TEST_USER_NAME,
  TEST_USER_GIVEN_NAME,
  TEST_USER_PHOTO,
} from "hermes/utils/mirage-utils";

export default Factory.extend({
  name: TEST_USER_NAME,
  firstName: TEST_USER_GIVEN_NAME,
  email: TEST_USER_EMAIL,
  picture: TEST_USER_PHOTO,
});
