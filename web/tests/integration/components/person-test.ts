import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import {
  TEST_USER_EMAIL,
  authenticateTestUser,
  pushMirageIntoStore,
} from "hermes/mirage/utils";

const BADGE = "[data-test-person-badge]";
const APPROVED_BADGE = '[data-test-person-badge-type="approved"]';
const REJECTED_BADGE = '[data-test-person-badge-type="rejected"]';
const ICON = "[data-test-person-badge-icon]";

interface PersonComponentTestContext extends MirageTestContext {
  ignoreUnknown: boolean;
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
    const email = "engineering@hashicorp.com";
    const name = "Engineering";

    this.server.create("person", {
      id: email,
      email,
      name,
    });

    pushMirageIntoStore(this);

    this.set("email", email);
    this.set("ignoreUnknown", false);

    await render<PersonComponentTestContext>(hbs`
        <Person
          @ignoreUnknown={{this.ignoreUnknown}}
          @email={{this.email}}
          class="person"
        />
    `);

    assert.dom(".person img").exists();

    assert
      .dom(".person .person-email")
      .hasText(name)
      .hasAttribute("title", name);
    assert.dom(".person svg").doesNotExist();

    assert.dom(".person img").exists();
    assert.dom(".person .person-email").hasText(name);
    assert.dom(".person svg").doesNotExist();

    this.set("email", null);
    this.set("ignoreUnknown", true);

    assert.dom(".person").doesNotExist();
  });

  test("it renders a contextual badge", async function (this: PersonComponentTestContext, assert) {
    this.set("badge", undefined);

    await render<PersonComponentTestContext>(hbs`
      <Person @email="" @badge={{this.badge}} />
    `);

    assert.dom(BADGE).doesNotExist();

    this.set("badge", "approved");

    assert.dom(APPROVED_BADGE).exists();

    assert
      .dom(ICON)
      .hasClass("text-color-palette-green-200")
      .hasAttribute("data-test-icon", "check-circle-fill");

    this.set("badge", "rejected");

    assert.dom(REJECTED_BADGE).exists();

    assert
      .dom(ICON)
      .hasClass("text-color-foreground-faint")
      .hasAttribute("data-test-icon", "x-circle-fill");

    this.set("badge", "pending");

    assert
      .dom(BADGE)
      .doesNotExist("only shows a badge if a valid value is passed in");
  });

  test(`the person is labeled "Me" if it's them`, async function (this: PersonComponentTestContext, assert) {
    this.set("email", TEST_USER_EMAIL);

    await render<PersonComponentTestContext>(hbs`
      <Person @email={{this.email}} />
    `);

    assert.dom(".person-email").hasText("Me");
  });
});
