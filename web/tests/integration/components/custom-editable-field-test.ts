import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { click, fillIn, findAll, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { HermesDocument, HermesUser } from "hermes/types/document";

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
    this.server.createList("person", 10);
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
        @onChange={{this.onChange}}
      />
    `);

    assert.dom("[data-test-custom-string-field]").hasText("---");
    assert.dom("[data-test-custom-people-field]").doesNotExist();

    this.set("attributes", {
      type: "PEOPLE",
    });

    assert.dom("[data-test-custom-people-field]").hasText("---");
    assert.dom("[data-test-custom-string-field]").doesNotExist();
  });

  test("PEOPLE can be removed", async function (this: CustomEditableFieldComponentTestContext, assert) {
    this.set("people", ["jeff.daley@hashicorp.com", "mishra@hashicorp.com"]);

    this.set("attributes", {
      type: "PEOPLE",
      value: this.people,
    });

    this.set("onChange", (people: HermesUser[]) => {
      this.set(
        "peopleValue",
        people.map((person) => person.email)
      );
    });

    await render<CustomEditableFieldComponentTestContext>(hbs`
      <CustomEditableField
        @document={{this.document}}
        @field="stakeholders"
        @attributes={{this.attributes}}
        @onChange={{this.onChange}}
      />
      <div class="click-away-target"/>
    `);

    let listItemText = findAll("[data-test-custom-people-field] li").map((li) =>
      li.textContent?.trim()
    );

    assert.deepEqual(listItemText, this.people, "shows the passed in people");

    assert.dom("[data-test-custom-people-field-input]").doesNotExist();

    await click("button");
    assert
      .dom("[data-test-custom-people-field-input]")
      .exists("shows the input field on click");

    // remove the first person
    await click("li:first-child span");

    // search the directory
    await fillIn("input", "user");

    // add a test user
    await click(".ember-power-select-dropdown li:first-child");

    await click(".click-away-target");

    assert.dom("[data-test-custom-people-field-input]").doesNotExist();

    listItemText = findAll("[data-test-custom-people-field] li").map((li) =>
      li.textContent?.trim()
    );

    assert.deepEqual(
      listItemText,
      ["mishra@hashicorp.com", "user1@hashicorp.com"],
      "the list updates via the onChange action"
    );
  });
});
