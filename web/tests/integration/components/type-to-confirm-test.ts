import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { TestContext, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";

interface Context extends TestContext {}

module("Integration | Component | type-to-confirm", function (hooks) {
  setupRenderingTest(hooks);

  test("it yields an input component", async function (this: Context, assert) {});

  test("it yields a `hasConfirmed` value", async function (this: Context, assert) {});

  test("it generates an id", async function (this: Context, assert) {});

  test("the `hasConfirmed` value is `true` when the input value matches the passed-in value", async function (this: Context, assert) {});

  test("in the `hasConfirmed` state, keying Enter runs the passed-in `onEnter` action ", async function (this: Context, assert) {});
});
