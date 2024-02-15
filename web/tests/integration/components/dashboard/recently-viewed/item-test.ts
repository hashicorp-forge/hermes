import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import RecentlyViewedService from "hermes/services/recently-viewed";

const NO_RECENTLY_VIEWED = "[data-test-no-recently-viewed]";
const ITEM = "[data-test-recently-viewed-item]";
const SCROLL_BACK_BUTTON = "[data-test-scroll-back]";
const SCROLL_FORWARD_BUTTON = "[data-test-scroll-forward]";

interface Context extends MirageTestContext {}

module(
  "Integration | Component | dashboard/recently-viewed/item",
  function (hooks) {
    setupRenderingTest(hooks);
    setupMirage(hooks);

    test("it renders correctly (doc)", async function (this: Context, assert) {});

    test("it renders correctly (project)", async function (this: Context, assert) {});

    test("it truncates product avatars", async function (this: Context, assert) {});
  },
);
