import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { TestContext, find, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";

interface TestModel {
  id: number;
  name: string;
}

interface ModelOrModelsTestContext extends TestContext {
  model?: TestModel;
  models?: TestModel[];
}

module("Integration | Helper | model-or-models", function (hooks) {
  setupRenderingTest(hooks);

  test("it accepts a single model", async function (this: ModelOrModelsTestContext, assert) {
    this.set("model", { id: 1, name: "foo" });

    await render<ModelOrModelsTestContext>(hbs`
        <LinkTo
          @route="authenticated.document"
          @models={{model-or-models this.model this.models}}
        >
          Click me
        </LinkTo>
    `);

    assert.equal(
      find("a")?.getAttribute("href"),
      "/document/1",
      "it renders the correct href"
    );
  });

  test("it accepts an array of models", async function (this: ModelOrModelsTestContext, assert) {
    this.set("models", [
      { id: 1, name: "foo" },
      { id: 2, name: "bar" },
    ]);

    /**
     * LinkTos, even in testing scenarios, require valid routes and models,
     * and since our app has no multi-model routes, we can't test this
     * using the href attribute. (Ember drops the `href` attribute if
     * the models are invalid.) So we use a loop instead.
     */
    await render<ModelOrModelsTestContext>(hbs`
      <div>
        {{#each (model-or-models this.model this.models) as |model|}}
          {{! @glint-ignore }}
          {{model.name}}
        {{/each}}
      </div>
    `);

    assert.dom("div").hasText("foo bar", "it renders the correct models");
  });

  test("it handles the no-model scenario", async function (this: ModelOrModelsTestContext, assert) {
    await render<ModelOrModelsTestContext>(hbs`
        <LinkTo
          @route="authenticated.dashboard"
          @models={{model-or-models this.model this.models}}
        >
          Click me
        </LinkTo>
    `);

    assert.equal(
      find("a")?.getAttribute("href"),
      "/dashboard",
      "it renders the correct href"
    );
  });
});
