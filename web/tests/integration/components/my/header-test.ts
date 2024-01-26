import { render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { setupRenderingTest } from "ember-qunit";
import {
  TEST_USER_EMAIL,
  TEST_USER_NAME,
  authenticateTestUser,
} from "hermes/mirage/utils";
import { module, test } from "qunit";

const AVATAR = "[data-test-avatar]";
const NAME = "[data-test-name]";
const EMAIL = "[data-test-email]";

module("Integration | Component | my/header", function (hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function (this: MirageTestContext) {
    await authenticateTestUser(this);
  });

  test("it renders correctly", async function (this: MirageTestContext, assert) {
    await render(hbs`
      <My::Header />
    `);

    assert.dom(AVATAR).exists();
    assert.dom(NAME).hasText(TEST_USER_NAME);
    assert.dom(EMAIL).hasText(TEST_USER_EMAIL);
  });

  test(`it renders a conditional "controls" block`, async function (this: MirageTestContext, assert) {
    await render(hbs`
      <My::Header>
        <:controls>
          <div data-test-controls/>
        </:controls>
      </My::Header>
    `);

    assert.dom("[data-test-controls]").exists();
  });
});
