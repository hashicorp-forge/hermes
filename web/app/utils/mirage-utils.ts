import { MirageTestContext } from "ember-cli-mirage/test-support";
import AuthenticatedUserService from "hermes/services/authenticated-user";
import ConfigService from "hermes/services/config";

export const TEST_USER_NAME = "Test user";
export const TEST_USER_EMAIL = "testuser@hashicorp.com";
export const TEST_USER_PHOTO = "https://test-user-at-hashicorp.com/photo.jpg";
export const TEST_USER_GIVEN_NAME = "Test";

export const TEST_USER_2_NAME = "Foo Bar";
export const TEST_USER_2_EMAIL = "foo@hashicorp.com";
export const TEST_USER_2_GIVEN_NAME = "Foo";

export const TEST_USER_3_EMAIL = "bar@hashicorp.com";

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

export function setFeatureFlag(
  mirageContext: MirageTestContext,
  flag: string,
  value: boolean,
) {
  const configSvc = mirageContext.owner.lookup(
    "service:config",
  ) as ConfigService;

  configSvc.config.feature_flags[flag] = value;
}
