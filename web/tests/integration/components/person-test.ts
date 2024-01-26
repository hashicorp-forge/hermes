import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import {
  TEST_USER_EMAIL,
  authenticateTestUser,
} from "hermes/mirage/mirage-utils";

const APPROVED_BADGE = "[data-test-person-approved-badge]";

interface PersonComponentTestContext extends MirageTestContext {
  ignoreUnknown: boolean;
  imgURL: string;
  email: string;
  badge: string | undefined;
}

module("Integration | Component | person", function (hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(function (this: PersonComponentTestContext) {
    authenticateTestUser(this);
  });

  test("it renders correctly", async function (this: PersonComponentTestContext, assert) {
    this.set("ignoreUnknown", false);
    this.set("imgURL", "https://hashicorp-avatar-url.com");
    this.set("email", "engineering@hashicorp.com");

    await render<PersonComponentTestContext>(hbs`
        <Person
          @ignoreUnknown={{this.ignoreUnknown}}
          @imgURL={{this.imgURL}}
          @email={{this.email}}
          class="person"
        />
    `);

    assert.dom(".person img").exists();

    assert
      .dom(".person .person-email")
      .hasText(this.email)
      .hasAttribute("title", this.email);
    assert.dom(".person svg").doesNotExist();

    this.set("imgURL", null);

    assert.dom(".person img").doesNotExist();
    assert.dom(".person .person-email").hasText(this.email);
    assert.dom(".person svg").exists();

    this.set("email", null);
    this.set("ignoreUnknown", true);

    assert.dom(".person").doesNotExist();
  });

  test("it renders a contextual checkmark", async function (this: PersonComponentTestContext, assert) {
    this.set("badge", undefined);

    await render<PersonComponentTestContext>(hbs`
      <Person @email="" @badge={{this.badge}} />
    `);

    assert.dom(APPROVED_BADGE).doesNotExist();

    this.set("badge", "approved");

    assert.dom(APPROVED_BADGE).exists();

    this.set("badge", "pending");

    assert
      .dom(APPROVED_BADGE)
      .doesNotExist("only shows a badge if the correct value is passed in");
  });

  test(`the person is labeled "Me" if it's them`, async function (this: PersonComponentTestContext, assert) {
    this.set("email", TEST_USER_EMAIL);

    await render<PersonComponentTestContext>(hbs`
      <Person @email={{this.email}} />
    `);

    assert.dom(".person-email").hasText("Me");
  });
});
