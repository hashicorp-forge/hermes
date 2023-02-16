import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { setupMirage } from "ember-cli-mirage/test-support";
import { MirageTestContext } from "ember-cli-mirage/test-support";
import {
  click,
  fillIn,
  find,
  render,
  triggerKeyEvent,
} from "@ember/test-helpers";
import { assert as emberAssert } from "@ember/debug";
import { hbs } from "ember-cli-htmlbars";

const SHORT_FACET_LIST = {
  RFC: {
    count: 10,
    selected: false,
  },
  PRD: {
    count: 5,
    selected: true,
  },
};

const LONG_FACET_LIST = {
  Filter01: { count: 1, selected: false },
  Filter02: { count: 1, selected: false },
  Filter03: { count: 1, selected: false },
  Filter04: { count: 1, selected: false },
  Filter05: { count: 1, selected: false },
  Filter06: { count: 1, selected: false },
  Filter07: { count: 1, selected: false },
  Filter08: { count: 1, selected: false },
  Filter09: { count: 1, selected: false },
  Filter10: { count: 1, selected: false },
  Filter11: { count: 1, selected: false },
  Filter12: { count: 1, selected: false },
  Filter13: { count: 1, selected: false },
};

module("Integration | Component | header/facet-dropdown", function (hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

  test("it toggles when the trigger is clicked", async function (this: MirageTestContext, assert) {
    this.set("facets", SHORT_FACET_LIST);

    await render(hbs`
      <Header::FacetDropdown
        @label="Type"
        @facets={{this.facets}}
      />
    `);

    assert.dom(".facet-dropdown-popover").doesNotExist();
    await click("[data-test-facet-dropdown-trigger]");
    assert.dom(".facet-dropdown-popover").exists("The dropdown is shown");
  });

  test("it renders the facets correctly", async function (this: MirageTestContext, assert) {
    this.set("facets", SHORT_FACET_LIST);

    await render(hbs`
      <Header::FacetDropdown
        @label="Type"
        @facets={{this.facets}}
      />
    `);

    await click("[data-test-facet-dropdown-trigger]");

    assert
      .dom("[data-test-facet-dropdown-menu-item]:nth-child(1)")
      .hasText("RFC 10", "Correct facet name and count");
    assert
      .dom("[data-test-facet-dropdown-menu-item]:nth-child(1) .flight-icon")
      .hasStyle({ visibility: "hidden" }, "Unselected facets have no icon");
    assert
      .dom("[data-test-facet-dropdown-menu-item]:nth-child(2)")
      .hasText("PRD 5", "Correct facet name and count");
    assert
      .dom("[data-test-facet-dropdown-menu-item]:nth-child(2) .flight-icon")
      .hasStyle({ visibility: "visible" }, "Selected facets have an icon");
  });

  test("the list can be filtered when there are more than 12 facets", async function (this: MirageTestContext, assert) {
    this.set("facets", LONG_FACET_LIST);

    await render(hbs`
      <Header::FacetDropdown
        @label="Type"
        @facets={{this.facets}}
      />
    `);

    await click("[data-test-facet-dropdown-trigger]");

    assert
      .dom(".facet-dropdown-popover")
      .hasClass("large", "The popover has the correct class");

    assert.dom(".facet-dropdown-input").exists("The input is shown");

    assert.equal(
      document.activeElement,
      find(".facet-dropdown-input"),
      "The input is autofocused"
    );

    assert.dom("[data-test-facet-dropdown-menu-item]").exists({ count: 13 });

    await fillIn(".facet-dropdown-input", "3");

    assert
      .dom("[data-test-facet-dropdown-menu-item]")
      .exists({ count: 2 }, "The facets are filtered");

    await fillIn(".facet-dropdown-input", "foobar");

    assert.dom("[data-test-facet-dropdown-menu]").doesNotExist()
    assert.dom('[data-test-facet-dropdown-menu-empty-state]').exists();
  });

  test("keyboard navigation works as expected", async function (this: MirageTestContext, assert) {
    this.set("facets", LONG_FACET_LIST);

    await render(hbs`
      <Header::FacetDropdown
        @label="Type"
        @facets={{this.facets}}
      />
    `);

    await click("[data-test-facet-dropdown-trigger]");

    let getActiveElement = () => {
      let activeElement = document.activeElement;
      emberAssert("activeElement must exist", activeElement);
      return activeElement;
    };

    await triggerKeyEvent(getActiveElement(), "keydown", "ArrowDown");

    assert.equal(
      document.activeElement,
      find("[data-test-facet-dropdown-menu-item]:nth-child(1) a"),
      "Keying down moves from the input to the first filter"
    );

    await triggerKeyEvent(getActiveElement(), "keydown", "ArrowDown");

    assert.equal(
      document.activeElement,
      find("[data-test-facet-dropdown-menu-item]:nth-child(2) a"),
      "Keying down moves from the first filter to the second filter"
    );

    await triggerKeyEvent(getActiveElement(), "keydown", "ArrowUp");

    assert.equal(
      document.activeElement,
      find("[data-test-facet-dropdown-menu-item]:nth-child(1) a"),
      "Keying up moves from the second filter to the first filter"
    );

    await triggerKeyEvent(getActiveElement(), "keydown", "ArrowUp");

    assert.equal(
      document.activeElement,
      find("[data-test-facet-dropdown-menu-item]:nth-child(13) a"),
      "Keying up from the input moves to the last filter"
    );

    await triggerKeyEvent(getActiveElement(), "keydown", "ArrowDown");

    assert.equal(
      document.activeElement,
      find("[data-test-facet-dropdown-menu-item]:nth-child(1) a"),
      "Keying down moves from the input to the first filter"
    );
  });
});
