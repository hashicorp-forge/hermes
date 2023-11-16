import { visit } from "@ember/test-helpers";
import { setupApplicationTest } from "ember-qunit";
import { module, test } from "qunit";
import { getPageTitle } from "ember-page-title/test-support";
import MockDate from "mockdate";
import { DEFAULT_MOCK_DATE } from "hermes/utils/mockdate/dates";

module("Acceptance | 404", function (hooks) {
  setupApplicationTest(hooks);

  test("unknown URLs get the 404 treatment", async function (assert) {
    MockDate.set(DEFAULT_MOCK_DATE);

    await visit("/not_real_url");

    assert.equal(getPageTitle(), "Page not found | Hermes");

    assert.dom("h1").hasText("[E-404] Page not found");
    assert.dom("[data-test-404-logged-time]").hasText("Logged: 1 January 2000");

    MockDate.reset();
  });
});
