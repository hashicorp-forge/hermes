import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { hbs } from "ember-cli-htmlbars";
import { click, fillIn, render, waitFor } from "@ember/test-helpers";
import { setupMirage } from "ember-cli-mirage/test-support";
import { MirageTestContext } from "ember-cli-mirage/test-support";
import {
  TEST_USER_EMAIL,
  authenticateTestUser,
  pushMirageIntoStore,
} from "hermes/mirage/utils";
import { Response } from "miragejs";
import {
  PEOPLE_SELECT_INPUT,
  PEOPLE_SELECT_OPTION,
} from "hermes/tests/helpers/selectors";

// Component-specific test selectors
const MULTISELECT = ".multiselect";
const TRIGGER = ".ember-basic-dropdown-trigger";
const NO_MATCHES_MESSAGE = ".ember-power-select-option--no-matches-message";

const PERSON_COUNT = 10;
const GROUP_COUNT = 5;

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
    this.server.createList("google/person", PERSON_COUNT);
    this.server.createList("group", GROUP_COUNT);

    this.set("people", []);
    this.set("onChange", (newValue: string[]) => this.set("people", newValue));

    authenticateTestUser(this);
  });

  test("it functions as expected", async function (this: PeopleSelectContext, assert) {
    this.server.create("group", {
      name: "Departed User",
    });

    this.server.create("group", {
      name: "User Who Was Terminated",
    });

    pushMirageIntoStore(this);

    await render<PeopleSelectContext>(hbs`
      <Inputs::PeopleSelect
        @selected={{this.people}}
        @onChange={{this.onChange}}
        @includeGroups={{true}}
      />
    `);

    await click(TRIGGER);

    assert.dom(PEOPLE_SELECT_OPTION).doesNotExist('"Type to search" message is hidden');

    await fillIn(PEOPLE_SELECT_INPUT, "u");

    assert
      .dom(PEOPLE_SELECT_OPTION)
      .exists(
        { count: PERSON_COUNT + GROUP_COUNT },
        'Options matching `u` are suggested, and groups containing "departed" or "terminated" are filtered out',
      );

    await fillIn(PEOPLE_SELECT_INPUT, "user 1");

    assert
      .dom(PEOPLE_SELECT_OPTION)
      .exists(
        { count: 2 },
        'Results are filtered to match "user 1" (this will includes user 10)',
      );

    await click(PEOPLE_SELECT_OPTION);
    assert
      .dom(".ember-power-select-multiple-option .person-email")
      .hasText("User 1", "User 1 was successfully selected");

    await fillIn(PEOPLE_SELECT_INPUT, "User 2");

    await click(PEOPLE_SELECT_OPTION);
    assert
      .dom(".ember-power-select-multiple-option .person-email")
      .exists({ count: 2 }, "User 2 was successfully selected");

    await fillIn(PEOPLE_SELECT_INPUT, "User 2");
    assert
      .dom(NO_MATCHES_MESSAGE)
      .hasText("No results found", "No duplicate users can be added");

    await click(
      ".ember-power-select-multiple-option .ember-power-select-multiple-remove-btn",
    );

    assert
      .dom(".ember-power-select-multiple-option .person-email")
      .exists({ count: 1 }, "People are removed from the list when clicked");

    await fillIn(PEOPLE_SELECT_INPUT, "group");

    assert
      .dom(PEOPLE_SELECT_OPTION)
      .exists({ count: GROUP_COUNT }, "Valid groups are suggested");
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

    let fillInPromise = fillIn(PEOPLE_SELECT_INPUT, "any text - we're not actually querying");

    await waitFor(".ember-power-select-option--loading-message");

    assert
      .dom(".ember-power-select-option--loading-message")
      .hasText("Loading...");

    await fillInPromise;

    assert.dom(PEOPLE_SELECT_OPTION).exists({ count: 10 }, "Returns results after retrying");
  });

  test("you can exclude the authenticated user from the list", async function (this: PeopleSelectContext, assert) {
    this.server.create("google/person", {
      emailAddresses: [{ value: TEST_USER_EMAIL }],
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
    await fillIn(PEOPLE_SELECT_INPUT, TEST_USER_EMAIL);

    assert
      .dom(PEOPLE_SELECT_OPTION)
      .doesNotExist("Authenticated user is not in the list of options");

    this.set("excludeSelf", false);

    await click(TRIGGER);
    await fillIn(PEOPLE_SELECT_INPUT, TEST_USER_EMAIL);

    assert
      .dom(PEOPLE_SELECT_OPTION)
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
    await fillIn(PEOPLE_SELECT_INPUT, "u");
    await click(PEOPLE_SELECT_OPTION);

    assert.dom(MULTISELECT).hasClass("selection-made");
    assert.dom(PEOPLE_SELECT_INPUT).isNotVisible("input is hidden after a selection is made");
  });
});
