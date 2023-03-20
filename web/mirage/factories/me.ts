import { Factory } from "miragejs";

export default Factory.extend({
  id: "123456789",
  email: "user@example.com",
  name: "User",
  given_name: "User",
  picture: "",
  subscriptions: [],
  isLoggedIn: true,
});
