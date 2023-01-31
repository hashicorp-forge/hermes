import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { click, findAll, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";

module("Integration | Component | custom-editable-field", function (hooks) {
  setupRenderingTest(hooks);

  test("it renders the correct input based on type", async function (assert) {
    this.set("attributes", {
      type: "STRING",
    });

    await render(hbs`
      <CustomEditableField
        @attributes={{this.attributes}}
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

  test("users can edit a PEOPLE list", async function (assert) {
    this.set("peopleValue", [
      "jeff.daley@hashicorp.com",
      "mishra@hashicorp.com",
    ]);

    this.set("attributes", {
      type: "PEOPLE",
      value: this.peopleValue,
    });

    this.set("updateEmails", (people) => {
      this.set(
        "peopleValue",
        people.map((person) => person.email)
      );
    });

    await render(hbs`
      <CustomEditableField
        @attributes={{this.attributes}}
      />
      <div class="click-away-target"/>
    `);

    let listItemText = findAll("[data-test-custom-people-field] li").map((li) =>
      li.textContent.trim()
    );

    assert.deepEqual(
      listItemText,
      this.peopleValue,
      "shows the passed in people"
    );

    assert.dom("[data-test-custom-people-field-input]").doesNotExist();

    await click("button");
    assert
      .dom("[data-test-custom-people-field-input]")
      .exists("shows the input field on click");

    await click("li:first-child span");
    await click(".click-away-target");

    assert.dom("[data-test-custom-people-field-input]").doesNotExist();

    // assert that the list item was removed and the text is now just the second email
    listItemText = findAll("[data-test-custom-people-field] li").map((li) =>
      li.textContent.trim()
    );

    assert.deepEqual(
      listItemText,
      this.peopleValue.slice(1),
      "the list updates"
    );
  });
});
