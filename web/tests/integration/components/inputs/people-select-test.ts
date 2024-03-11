import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { hbs } from "ember-cli-htmlbars";
import { click, fillIn, render, waitFor } from "@ember/test-helpers";
import { setupMirage } from "ember-cli-mirage/test-support";
import { MirageTestContext } from "ember-cli-mirage/test-support";
import { TEST_USER_EMAIL, authenticateTestUser } from "hermes/mirage/utils";
import { Response } from "miragejs";

const MULTISELECT = ".multiselect";
const TRIGGER = ".ember-basic-dropdown-trigger";
const INPUT = ".ember-power-select-trigger-multiple-input";
const OPTION = ".ember-power-select-option";

interface PeopleSelectContext extends MirageTestContext {
  people: string[];
  onChange: (newValue: string[]) => void;
  isFirstFetchAttempt: boolean;
  excludeSelf: boolean;
  isSingleSelect: boolean;
}

module("Integration | Component | inputs/people-select", function (hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(function (this: PeopleSelectContext) {
    authenticateTestUser(this);
    this.server.createList("google/person", 10);

    this.set("people", []);
    this.set("onChange", (newValue: string[]) => this.set("people", newValue));
  });

  test("it functions as expected", async function (this: PeopleSelectContext, assert) {
    await render<PeopleSelectContext>(hbs`
      <Inputs::PeopleSelect
        @selected={{this.people}}
        @onChange={{this.onChange}}
      />
    `);

    await click(TRIGGER);

    assert.dom(OPTION).doesNotExist('"Type to search" message is hidden');

    await fillIn(INPUT, "u");

    assert
      .dom(OPTION)
      .exists({ count: 10 }, "Options matching `u` are suggested");

    await fillIn(INPUT, "1");

    assert.dom(OPTION).exists({ count: 2 }, "Results are filtered to match 1");

    await click(OPTION);
    assert
      .dom(".ember-power-select-multiple-option .person-email")
      .hasText("User 1", "User 1 was successfully selected");

    await fillIn(INPUT, "2");

    await click(OPTION);
    assert
      .dom(".ember-power-select-multiple-option .person-email")
      .exists({ count: 2 }, "User 2 was successfully selected");

    await fillIn(INPUT, "2");
    assert
      .dom(OPTION)
      .hasText("No results found", "No duplicate users can be added");

    await click(
      ".ember-power-select-multiple-option .ember-power-select-multiple-remove-btn",
    );

    assert
      .dom(".ember-power-select-multiple-option .person-email")
      .exists({ count: 1 }, "People are removed from the list when clicked");
  });

  test("it will retry if the server returns an error", async function (this: PeopleSelectContext, assert) {
    this.set("isFirstFetchAttempt", true);

    this.server.post("/people", () => {
      if (this.isFirstFetchAttempt) {
        this.set("isFirstFetchAttempt", false);
        return new Response(504);
      } else {
        let people = JSON.stringify(
          this.server.schema["google/people"].all().models,
        );
        return new Response(200, {}, people);
      }
    });

    await render<PeopleSelectContext>(hbs`
      <Inputs::PeopleSelect
        @selected={{this.people}}
        @onChange={{this.onChange}}
      />
    `);

    await click(TRIGGER);

    let fillInPromise = fillIn(INPUT, "any text - we're not actually querying");

    await waitFor(".ember-power-select-option--loading-message");

    assert
      .dom(".ember-power-select-option--loading-message")
      .hasText("Loading...");

    await fillInPromise;

    assert.dom(OPTION).exists({ count: 5 }, "Returns results after retrying");
  });

  test("you can exclude the authenticated user from the list", async function (this: PeopleSelectContext, assert) {
    this.server.create("google/person", {
      emailAddresses: [TEST_USER_EMAIL],
    });

    this.set("excludeSelf", true);

    await render<PeopleSelectContext>(hbs`
      <Inputs::PeopleSelect
        @selected={{this.people}}
        @onChange={{this.onChange}}
        @excludeSelf={{this.excludeSelf}}
      />
    `);

    await click(TRIGGER);
    await fillIn(INPUT, TEST_USER_EMAIL);

    assert
      .dom(OPTION)
      .doesNotExist("Authenticated user is not in the list of options");

    this.set("excludeSelf", false);

    assert
      .dom(OPTION)
      .exists({ count: 1 }, "Authenticated user is in the list of options");
  });

  test("you can limit the selection to a single person", async function (this: PeopleSelectContext, assert) {
    this.set("isSingleSelect", true);

    await render<PeopleSelectContext>(hbs`
      <Inputs::PeopleSelect
        @selected={{this.people}}
        @onChange={{this.onChange}}
        @isSingleSelect={{this.isSingleSelect}}
      />
    `);

    assert.dom(MULTISELECT).doesNotHaveClass("selection-made");

    await click(TRIGGER);
    await fillIn(INPUT, "u");
    await click(OPTION);

    assert.dom(MULTISELECT).hasClass("selection-made");
    assert.dom(INPUT).doesNotExist("input is hidden after a selection is made");
  });
});
