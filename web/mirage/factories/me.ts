import { Factory } from "miragejs";
import { TEST_USER_EMAIL } from "hermes/utils/mirage-utils";

export default Factory.extend({
  id: "123456789",
  email: TEST_USER_EMAIL,
  name: "User",
  given_name: "User",
  picture: "",
  subscriptions: [],
  isLoggedIn: true,
});
