import { click, findAll, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { setupRenderingTest } from "ember-qunit";
import { module, test } from "qunit";
import { assert as emberAssert } from "@ember/debug";
import {
  MoveOptionIcon,
  MoveOptionLabel,
} from "hermes/components/project/resource";

const DRAG_HANDLE = "[data-test-drag-handle]";
const MOVE_OPTION = "[data-test-move-option]";
const MOVE_ICON = "[data-test-move-icon]";

interface Context extends MirageTestContext {
  overflowMenuItems: {};
  isReadOnly: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  moveToTop: () => void;
  moveUp: () => void;
  moveDown: () => void;
  moveToBottom: () => void;
}

module("Integration | Component | project/resource", function (hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function (this: Context) {
    this.set("overflowMenuItems", {});
    this.set("canMoveUp", true);
    this.set("canMoveDown", true);
    this.set("moveToTop", () => {});
    this.set("moveUp", () => {});
    this.set("moveDown", () => {});
    this.set("moveToBottom", () => {});
  });

  test("it shows drag controls unless read-only", async function (this: Context, assert) {
    this.set("isReadOnly", true);

    await render<Context>(hbs`
      <Project::Resource
        @overflowMenuItems={{this.overflowMenuItems}}
        @canMoveUp={{this.canMoveUp}}
        @canMoveDown={{this.canMoveDown}}
        @moveToTop={{this.moveToTop}}
        @moveUp={{this.moveUp}}
        @moveDown={{this.moveDown}}
        @moveToBottom={{this.moveToBottom}}
        @isReadOnly={{this.isReadOnly}}
      />
    `);

    assert
      .dom(DRAG_HANDLE)
      .doesNotExist("drag handle is not shown when read-only");

    this.set("isReadOnly", false);

    assert.dom(DRAG_HANDLE).exists("drag handle is shown when not read-only");
  });

  test("it shows options based on `canMoveUp` and `canMoveDown`", async function (this: Context, assert) {
    await render<Context>(hbs`
      <Project::Resource
        @overflowMenuItems={{this.overflowMenuItems}}
        @canMoveUp={{this.canMoveUp}}
        @canMoveDown={{this.canMoveDown}}
        @moveToTop={{this.moveToTop}}
        @moveUp={{this.moveUp}}
        @moveDown={{this.moveDown}}
        @moveToBottom={{this.moveToBottom}}
      />
    `);

    await click(DRAG_HANDLE);

    assert.dom(MOVE_OPTION).exists({ count: 4 }, "all move options are shown");

    const moveIcons = findAll(MOVE_ICON).map((el) =>
      el.getAttribute("data-test-icon"),
    );

    assert.deepEqual(
      moveIcons,
      [
        MoveOptionIcon.Top,
        MoveOptionIcon.Up,
        MoveOptionIcon.Down,
        MoveOptionIcon.Bottom,
      ],
      "correct icons are shown",
    );

    let labels = findAll(MOVE_OPTION).map((el) => el.textContent?.trim());

    assert.deepEqual(
      labels,
      [
        MoveOptionLabel.Top,
        MoveOptionLabel.Up,
        MoveOptionLabel.Down,
        MoveOptionLabel.Bottom,
      ],
      "correct labels are shown when both `canMoveUp` and `canMoveDown` are true",
    );

    this.set("canMoveUp", false);

    labels = findAll(MOVE_OPTION).map((el) => el.textContent?.trim());

    assert.deepEqual(
      labels,
      [MoveOptionLabel.Down, MoveOptionLabel.Bottom],
      "only move-down options are shown when `canMoveUp` is false",
    );

    this.set("canMoveUp", true);
    this.set("canMoveDown", false);

    labels = findAll(MOVE_OPTION).map((el) => el.textContent?.trim());

    assert.deepEqual(
      labels,
      [MoveOptionLabel.Top, MoveOptionLabel.Up],
      "only move-up options are shown when `canMoveDown` is false",
    );
  });

  test("it triggers the correct action when an option is clicked", async function (this: Context, assert) {
    let [moveToTopCount, moveUpCount, moveDownCount, moveToBottomCount] = [
      0, 0, 0, 0,
    ];

    this.set("moveToTop", () => moveToTopCount++);
    this.set("moveUp", () => moveUpCount++);
    this.set("moveDown", () => moveDownCount++);
    this.set("moveToBottom", () => moveToBottomCount++);

    await render<Context>(hbs`
      <Project::Resource
        @overflowMenuItems={{this.overflowMenuItems}}
        @canMoveUp={{this.canMoveUp}}
        @canMoveDown={{this.canMoveDown}}
        @moveToTop={{this.moveToTop}}
        @moveUp={{this.moveUp}}
        @moveDown={{this.moveDown}}
        @moveToBottom={{this.moveToBottom}}
      />
    `);

    await click(DRAG_HANDLE);
    await click(MOVE_OPTION);

    assert.equal(moveToTopCount, 1);
    assert.equal(moveUpCount, 0);
    assert.equal(moveDownCount, 0);
    assert.equal(moveToBottomCount, 0);

    await click(DRAG_HANDLE);

    const secondOption = findAll(MOVE_OPTION)[1];

    emberAssert("second move option exists", secondOption);

    await click(secondOption);

    assert.equal(moveToTopCount, 1);
    assert.equal(moveUpCount, 1);
    assert.equal(moveDownCount, 0);
    assert.equal(moveToBottomCount, 0);

    await click(DRAG_HANDLE);

    const thirdOption = findAll(MOVE_OPTION)[2];

    emberAssert("third move option exists", thirdOption);

    await click(thirdOption);

    assert.equal(moveToTopCount, 1);
    assert.equal(moveUpCount, 1);
    assert.equal(moveDownCount, 1);
    assert.equal(moveToBottomCount, 0);

    await click(DRAG_HANDLE);

    const fourthOption = findAll(MOVE_OPTION)[3];

    emberAssert("fourth move option exists", fourthOption);

    await click(fourthOption);

    assert.equal(moveToTopCount, 1);
    assert.equal(moveUpCount, 1);
    assert.equal(moveDownCount, 1);
    assert.equal(moveToBottomCount, 1);
  });
});
