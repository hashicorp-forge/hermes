import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { click, fillIn, find, findAll, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { HermesDocument } from "hermes/types/document";
import { authenticateTestUser } from "hermes/mirage/utils";

interface CustomEditableFieldComponentTestContext extends MirageTestContext {
  attributes: any;
  document: HermesDocument;
  onChange: () => void;
  people: string[];
}

module("Integration | Component | custom-editable-field", function (hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(function (this: CustomEditableFieldComponentTestContext) {
    authenticateTestUser(this);
    this.server.createList("google/person", 10);
    this.server.create("document");

    this.set("onChange", () => {});
    this.set("document", this.server.schema.document.first());
    this.set("people", []);
  });

  test("it renders the correct input based on type", async function (this: CustomEditableFieldComponentTestContext, assert) {
    this.set("attributes", {
      type: "STRING",
      value: null,
    });

    await render<CustomEditableFieldComponentTestContext>(hbs`
      <CustomEditableField
        @document={{this.document}}
        @field="stakeholders"
        @attributes={{this.attributes}}
        @onSave={{this.onChange}}
      />
    `);

    assert.dom("[data-test-custom-field-type='string']").hasText("None");
    assert.dom("[data-test-custom-field-type='people']").doesNotExist();

    this.set("attributes", {
      type: "PEOPLE",
    });

    assert.dom("[data-test-custom-field-type='people']").hasText("None");
    assert.dom("[data-test-custom-field-type='string']").doesNotExist();
  });

  test("PEOPLE can be removed", async function (this: CustomEditableFieldComponentTestContext, assert) {
    this.set("people", ["jeff.daley@hashicorp.com", "mishra@hashicorp.com"]);

    this.set("attributes", {
      type: "PEOPLE",
      value: this.people,
    });

    this.set("onChange", (people: string[]) => {
      this.set("people", people);
    });

    await render<CustomEditableFieldComponentTestContext>(hbs`
      <CustomEditableField
        @document={{this.document}}
        @field="stakeholders"
        @attributes={{this.attributes}}
        @onSave={{this.onChange}}
      />
      <div class="click-away-target"/>
    `);
    const textSelector = "[data-test-custom-field] li [data-test-person-email]";

    let listItemText = findAll(textSelector).map(
      (li) => li.textContent?.trim(),
    );

    assert.deepEqual(listItemText, this.people, "shows the passed in people");

    assert.dom("[data-test-custom-people-field-input]").doesNotExist();

    await click("button");

    assert
      .dom("[data-test-custom-field]")
      .exists("shows the input field on click");

    // remove the first person
    await click("li:first-child span");

    // search the directory
    await fillIn("input", "user");

    // add a test user
    await click(".ember-power-select-dropdown li:first-child");

    await click(".click-away-target");

    assert.dom("[data-test-custom-people-field-input]").doesNotExist();

    listItemText = findAll(textSelector).map((li) => li.textContent?.trim());

    assert.deepEqual(
      listItemText,
      ["mishra@hashicorp.com", "User 1"],
      "the front-end list updates (using displayNames if they're in the store)",
    );

    const expectedPeople = ["mishra@hashicorp.com", "user1@hashicorp.com"];

    assert.deepEqual(
      this.people,
      expectedPeople,
      "the reference list updates (using email addresses)",
    );
  });

  test("PEOPLE inputs receive focus on click", async function (this: CustomEditableFieldComponentTestContext, assert) {
    this.set("attributes", {
      type: "PEOPLE",
      value: this.people,
    });

    await render<CustomEditableFieldComponentTestContext>(hbs`
      <CustomEditableField
        @document={{this.document}}
        @field="stakeholders"
        @attributes={{this.attributes}}
        @onSave={{this.onChange}}
      />
    `);

    const stakeholdersSelector = "[data-test-custom-field]";
    await click(`${stakeholdersSelector} .field-toggle`);

    assert.true(
      document.activeElement === find(`${stakeholdersSelector} input`),
    );
  });
});
