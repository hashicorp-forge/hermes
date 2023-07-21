import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";

module("Integration | Component | person", function (hooks) {
  setupRenderingTest(hooks);

  test("it renders correctly", async function (assert) {
    this.set("ignoreUnknown", false);
    this.set("imgURL", "https://hashicorp-avatar-url.com");
    this.set("email", "engineering@hashicorp.com");

    await render(hbs`
        <Person
          @ignoreUnknown={{this.ignoreUnknown}}
          @imgURL={{this.imgURL}}
          @email={{this.email}}
          class="person"
        />
    `);

    assert.dom(".person img").exists();

    assert
      .dom(".person .person-email")
      .hasText(this.email)
      .hasAttribute("title", this.email);
    assert.dom(".person span").doesNotExist();
    assert.dom(".person svg").doesNotExist();

    this.set("imgURL", null);

    assert.dom(".person img").doesNotExist();
    assert.dom(".person .person-email").hasText(this.email);
    assert.dom(".person span").hasText("e");
    assert.dom(".person svg").doesNotExist();

    this.set("email", null);

    assert.dom(".person img").doesNotExist();
    assert.dom(".person .person-email").hasText("Unknown");
    assert.dom(".person span").doesNotExist();
    assert.dom(".person svg").exists();

    this.set("ignoreUnknown", true);

    assert.dom(".person").doesNotExist();
  });

  test("it renders a contextual checkmark", async function (assert) {
    this.set("badge", null);

    await render(hbs`
      <Person
        @badge={{this.badge}}
      />
    `);

    assert.dom("[data-test-person-reviewed-badge]").doesNotExist();

    this.set("badge", "reviewed");

    assert.dom("[data-test-person-reviewed-badge]").exists();

    this.set("badge", "pending");

    assert
      .dom("[data-test-person-reviewed-badge]")
      .doesNotExist("only shows a badge if the correct value is passed in");
  });
});
