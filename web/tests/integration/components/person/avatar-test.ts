import { TestContext, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { setupRenderingTest } from "ember-qunit";
import { module, test } from "qunit";

const AVATAR = "[data-test-person-avatar]";
const LOADING = `${AVATAR} [data-test-loading]`;
const IMAGE = `${AVATAR} [data-test-image]`;
const FALLBACK = `${AVATAR} [data-test-fallback]`;

interface PersonAvatarTestContext extends TestContext {
  isLoading?: boolean;
  imgURL?: string;
}

module("Integration | Component | person/avatar", async function (hooks) {
  setupRenderingTest(hooks);

  test("it renders at different sizes", async function (this: PersonAvatarTestContext, assert) {
    await render<PersonAvatarTestContext>(hbs`
      <Person::Avatar class="default" @email="" />
      <Person::Avatar class="small" @email="" @size="small" />
      <Person::Avatar class="medium" @email="" @size="medium" />
      <Person::Avatar class="large" @email="" @size="large" />
      <Person::Avatar class="xl" @email="" @size="xl" />
    `);

    function assertIconSize(containerClass: string, size: string) {
      assert
        .dom(`.${containerClass} .flight-icon`)
        .hasAttribute("width", size)
        .hasAttribute("height", size);
    }

    assert.dom(".default").hasStyle({ width: "20px" });
    assert.dom(".default").hasStyle({ height: "20px" });
    assertIconSize("default", "16");

    assert.dom(".small").hasStyle({ width: "20px" });
    assert.dom(".small").hasStyle({ height: "20px" });
    assertIconSize("small", "16");

    assert.dom(".medium").hasStyle({ width: "28px" });
    assert.dom(".medium").hasStyle({ height: "28px" });
    assertIconSize("medium", "16");

    assert.dom(".large").hasStyle({ width: "36px" });
    assert.dom(".large").hasStyle({ height: "36px" });
    assertIconSize("large", "24");

    assert.dom(".xl").hasStyle({ width: "64px" });
    assert.dom(".xl").hasStyle({ height: "64px" });
    assertIconSize("xl", "24");
  });

  test("it can render a loading state", async function (this: PersonAvatarTestContext, assert) {
    this.set("isLoading", true);

    await render<PersonAvatarTestContext>(hbs`
      <Person::Avatar @email="Test User" @isLoading={{this.isLoading}} />
    `);

    assert.dom(LOADING).exists();

    this.set("isLoading", false);

    assert.dom(LOADING).doesNotExist();
  });

  test("it renders an image if provided and a fallback if not", async function (this: PersonAvatarTestContext, assert) {
    this.set("imgURL", "#");

    await render<PersonAvatarTestContext>(hbs`
      <Person::Avatar @email="Barbara" @imgURL={{this.imgURL}} />
    `);

    assert.dom(IMAGE).hasAttribute("src", "#");
    assert.dom(FALLBACK).doesNotExist();

    this.set("imgURL", undefined);

    assert.dom(IMAGE).doesNotExist();
    assert.dom(FALLBACK).exists();
  });
});
