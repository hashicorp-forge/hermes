import { click, findAll, visit } from "@ember/test-helpers";
import { setupApplicationTest } from "ember-qunit";
import { module, test } from "qunit";
import { authenticateSession } from "ember-simple-auth/test-support";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { getPageTitle } from "ember-page-title/test-support";
import AuthenticatedUserService, {
  SubscriptionType,
} from "hermes/services/authenticated-user";
import { assert as emberAssert } from "@ember/debug";

const TOGGLE = "[data-test-subscription-dropdown-toggle]";
const SUBSCRIPTION_OPTION = "[data-test-subscription-option]";

interface Context extends MirageTestContext {}

module("Acceptance | authenticated/settings", function (hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function () {
    await authenticateSession({});
  });

  test("the page title is correct", async function (this: Context, assert) {
    await visit("/settings");
    assert.equal(getPageTitle(), "Email Notifications | Hermes");
  });

  test("you can manage product-area subscriptions", async function (this: Context, assert) {
    await visit("/settings");

    const authenticatedUser = this.owner.lookup(
      "service:authenticated-user",
    ) as AuthenticatedUserService;

    const { subscriptions } = authenticatedUser;

    assert.equal(
      subscriptions?.length,
      0,
      "there are initially no subscriptions",
    );

    // change the subscription to "Instant"

    await click(TOGGLE);
    await click(SUBSCRIPTION_OPTION);

    assert.equal(subscriptions?.length, 1, "there is now one subscription");

    assert.equal(
      subscriptions?.objectAt(0)?.subscriptionType,
      SubscriptionType.Instant,
      "the user added an instant subscription",
    );

    // change the subscription to "Digest"

    await click(TOGGLE);

    const digestOption = findAll(SUBSCRIPTION_OPTION)[1];
    emberAssert("digest option must exist", digestOption);

    await click(digestOption);

    assert.equal(subscriptions?.length, 1, "there is still one subscription");

    assert.equal(
      subscriptions?.objectAt(0)?.subscriptionType,
      SubscriptionType.Digest,
      'the user changed their subscription to "Digest"',
    );

    // change the subscription to "Unsubscribed"

    await click(TOGGLE);

    const unsubscribeOption = findAll(SUBSCRIPTION_OPTION)[2];
    emberAssert("unsubscribe option must exist", unsubscribeOption);

    await click(unsubscribeOption);

    assert.equal(subscriptions?.length, 0, "there are no subscriptions");
  });
});
