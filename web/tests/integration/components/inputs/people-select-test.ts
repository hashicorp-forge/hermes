import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { hbs } from "ember-cli-htmlbars";
import { click, fillIn, render, waitFor } from "@ember/test-helpers";
import { setupMirage } from "ember-cli-mirage/test-support";
import { MirageTestContext } from "ember-cli-mirage/test-support";
import { HermesUser } from "hermes/types/document";
import FetchService from "hermes/services/fetch";

interface PeopleSelectContext extends MirageTestContext {
  people: HermesUser[];
  onChange: (newValue: HermesUser[]) => void;
  isFirstFetchAttempt: boolean;
}

module("Integration | Component | inputs/people-select", function (hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

  test("it functions as expected", async function (this: PeopleSelectContext, assert) {
    this.server.createList("person", 10);

    this.set("people", []);
    this.onChange = (newValue) => this.set("people", newValue);

    await render(hbs`
      {{! @glint-nocheck: not typesafe yet }}
      <Inputs::PeopleSelect
        @selected={{this.people}}
        @onChange={{this.onChange}}
      />
    `);

    await click(".ember-basic-dropdown-trigger");

    assert
      .dom(".ember-power-select-option")
      .exists({ count: 1 })
      .hasText("Type to search");

    await fillIn(".ember-power-select-trigger-multiple-input", "u");

    assert
      .dom(".ember-power-select-option")
      .exists({ count: 10 }, "Options matching `u` are suggested");

    await fillIn(".ember-power-select-trigger-multiple-input", "1");

    assert
      .dom(".ember-power-select-option")
      .exists({ count: 2 }, "Results are filtered to match 1");

    await click(".ember-power-select-option");
    assert
      .dom(".ember-power-select-multiple-option .person-email")
      .hasText("user1@hashicorp.com", "User 1 was successfully selected");

    await fillIn(".ember-power-select-trigger-multiple-input", "2");

    await click(".ember-power-select-option");
    assert
      .dom(".ember-power-select-multiple-option .person-email")
      .exists({ count: 2 }, "User 2 was successfully selected");

    await fillIn(".ember-power-select-trigger-multiple-input", "2");
    assert
      .dom(".ember-power-select-option")
      .hasText("No results found", "No duplicate users can be added");

    await click(
      ".ember-power-select-multiple-option .ember-power-select-multiple-remove-btn"
    );

    assert
      .dom(".ember-power-select-multiple-option .person-email")
      .exists({ count: 1 }, "People are removed from the list when clicked");
  });

  test("it will retry if the server returns an error", async function (this: PeopleSelectContext, assert) {
    this.server.createList("person", 5);

    this.set("people", []);
    this.onChange = (newValue) => this.set("people", newValue);
    this.set("isFirstFetchAttempt", true);

    let fetchSvc = this.owner.lookup("service:fetch") as FetchService;

    fetchSvc.set("fetch", async () => {
      if (this.isFirstFetchAttempt) {
        this.set("isFirstFetchAttempt", false);
        return new Response(null, { status: 504 });
      } else {
        let people = JSON.stringify(this.server.schema.people.all().models);
        return new Response(people, { status: 200 });
      }
    });

    await render(hbs`
      {{! @glint-nocheck: not typesafe yet }}
      <Inputs::PeopleSelect
        @selected={{this.people}}
        @onChange={{this.onChange}}
      />
    `);

    await click(".ember-basic-dropdown-trigger");

    let fillInPromise = fillIn(
      ".ember-power-select-trigger-multiple-input",
      "any text - we're not actually querying"
    );

    await waitFor(".ember-power-select-option--loading-message");

    assert
      .dom(".ember-power-select-option--loading-message")
      .hasText("Loading options...");

    await fillInPromise;

    assert
      .dom(".ember-power-select-option")
      .exists({ count: 5 }, "Returns results after retrying");
  });
});
