import { MirageTestContext } from "ember-cli-mirage/test-support";
import AuthenticatedUserService from "hermes/services/authenticated-user";

export const TEST_USER_NAME = "Test user";
export const TEST_USER_EMAIL = "testuser@hashicorp.com";
export const TEST_USER_GIVEN_NAME = "Test";

export function authenticateTestUser(mirageContext: MirageTestContext) {
  const authenticatedUserService = mirageContext.owner.lookup(
    "service:authenticated-user",
  ) as AuthenticatedUserService;

  authenticatedUserService._info = {
    name: TEST_USER_NAME,
    email: TEST_USER_EMAIL,
    given_name: TEST_USER_GIVEN_NAME,
    picture: "",
    subscriptions: [],
  };
}
