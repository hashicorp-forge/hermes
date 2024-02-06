import { render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { setupRenderingTest } from "ember-qunit";
import { TEST_USER_EMAIL, authenticateTestUser } from "hermes/mirage/utils";
import { HermesDocument } from "hermes/types/document";
import { module, test } from "qunit";

const BADGE = "[data-test-person-badge]";
const APPROVED_BADGE = '[data-test-person-badge-type="approved"]';
const REJECTED_BADGE = '[data-test-person-badge-type="rejected"]';
const ICON = "[data-test-person-badge-icon]";

interface Context extends MirageTestContext {
  document: HermesDocument;
  email: string;
}

module(
  "Integration | Component | editable-field/read-value/person",
  function (hooks) {
    setupRenderingTest(hooks);
    setupMirage(hooks);

    hooks.beforeEach(function (this: Context) {
      authenticateTestUser(this);
    });

    test("it renders a conditional badge", async function (this: Context, assert) {
      this.set("document", {
        approvedBy: [],
        changesRequestedBy: [],
      });

      this.set("email", TEST_USER_EMAIL);

      await render<Context>(hbs`
        <EditableField::ReadValue::Person
          @email={{this.email}}
          @document={{this.document}}
        />
      `);

      assert.dom(BADGE).doesNotExist();

      this.set("document", {
        approvedBy: [TEST_USER_EMAIL],
      });

      assert.dom(APPROVED_BADGE).exists();

      assert
        .dom(ICON)
        .hasClass("text-color-palette-green-200")
        .hasAttribute("data-test-icon", "check-circle-fill");

      this.set("document", {
        changesRequestedBy: [TEST_USER_EMAIL],
      });

      assert.dom(REJECTED_BADGE).exists();

      assert
        .dom(ICON)
        .hasClass("text-color-foreground-faint")
        .hasAttribute("data-test-icon", "x-circle-fill");
    });
  },
);
