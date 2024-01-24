import { module, test } from "qunit";
import { setupTest } from "ember-qunit";
import AuthenticatedUserService, {
  SubscriptionType,
} from "hermes/services/authenticated-user";
import { authenticateSession } from "ember-simple-auth/test-support";
import {
  TEST_USER_EMAIL,
  TEST_USER_GIVEN_NAME,
  TEST_USER_NAME,
  authenticateTestUser,
} from "hermes/utils/mirage-utils";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { assert as emberAssert } from "@ember/debug";
import ConfigService from "hermes/services/config";
import { Response } from "miragejs";

interface Context extends MirageTestContext {
  authenticatedUser: AuthenticatedUserService;
}

module("Unit | Service | authenticated-user", function (hooks) {
  setupTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function (this: Context) {
    await authenticateSession({});

    this.set(
      "authenticatedUser",
      this.owner.lookup(
        "service:authenticated-user",
      ) as AuthenticatedUserService,
    );
  });

  test("it loads the user info", async function (this: Context, assert) {
    assert.equal(
      this.authenticatedUser._info,
      null,
      "the user info is initially null",
    );

    await this.authenticatedUser.loadInfo.perform();

    emberAssert("user info must exist", this.authenticatedUser._info);

    const { name, email, given_name } = this.authenticatedUser._info;

    assert.equal(name, TEST_USER_NAME);
    assert.equal(email, TEST_USER_EMAIL);
    assert.equal(given_name, TEST_USER_GIVEN_NAME);
  });

  test("it fetches user subscriptions", async function (this: Context, assert) {
    authenticateTestUser(this);

    const configSvc = this.owner.lookup("service:config") as ConfigService;

    assert.equal(
      this.authenticatedUser.subscriptions,
      null,
      "the subscriptions are initially null",
    );

    // add a subscription to the user

    this.server.schema.mes.create({
      subscriptions: [
        {
          productArea: "waypoint",
          subscriptionType: SubscriptionType.Instant,
        },
      ],
    });

    await this.authenticatedUser.fetchSubscriptions.perform();

    emberAssert(
      "subscriptions must exist",
      this.authenticatedUser.subscriptions,
    );

    const { subscriptions } = this.authenticatedUser;

    assert.equal(subscriptions.length, 1);

    const subscription = subscriptions[0];

    assert.equal(subscription?.productArea, "waypoint");
    assert.equal(subscription?.subscriptionType, SubscriptionType.Instant);
  });

  test("the setSubscription method works as expected", async function (this: Context, assert) {
    authenticateTestUser(this);

    this.server.create("me");

    await this.authenticatedUser.fetchSubscriptions.perform();

    assert.equal(this.authenticatedUser.subscriptions?.length, 0);

    // Add a subscription
    await this.authenticatedUser.setSubscription.perform(
      "Waypoint",
      SubscriptionType.Instant,
    );

    let subscription = this.authenticatedUser.subscriptions?.[0];

    assert.equal(subscription?.productArea, "Waypoint");
    assert.equal(
      subscription?.subscriptionType,
      SubscriptionType.Instant,
      "the subscription type defaults to instant",
    );

    // update a subscription
    await this.authenticatedUser.setSubscription.perform(
      "Waypoint",
      SubscriptionType.Digest,
    );

    subscription = this.authenticatedUser.subscriptions?.[0];

    assert.equal(subscription?.productArea, "Waypoint");
    assert.equal(
      subscription?.subscriptionType,
      SubscriptionType.Digest,
      "the subscription type is updated",
    );

    // remove a subscription
    await this.authenticatedUser.setSubscription.perform("Waypoint", undefined);

    assert.equal(this.authenticatedUser.subscriptions?.length, 0);
  });
});
