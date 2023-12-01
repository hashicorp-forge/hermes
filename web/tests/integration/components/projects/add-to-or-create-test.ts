import { hbs } from "ember-cli-htmlbars";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { setupRenderingTest } from "ember-qunit";
import { module, test } from "qunit";

interface Context extends MirageTestContext {}

module("Integration | Component | projects/add-to-or-create", function (hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function (this: Context) {});

  test("it renders as expected (complete model)", async function (this: Context, assert) {});

  test("you can add a doc to an existing project", async function (this: Context, assert) {});

  test("you can add a doc to a new project", async function (this: Context, assert) {});

  test("it shows a loading icon when search is running", async function (this: Context, assert) {});

  test("it shows an error state if search fails", async function (this: Context, assert) {});

  test("you can search for a project", async function (this: Context, assert) {});
});
