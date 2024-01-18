import {
  click,
  fillIn,
  find,
  findAll,
  render,
  triggerKeyEvent,
} from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { setupRenderingTest } from "ember-qunit";
import { HermesDocument } from "hermes/types/document";
import { HermesProjectInfo } from "hermes/types/project";
import { ProjectStatus } from "hermes/types/project-status";
import { module, test } from "qunit";

const OPTION = "[data-test-project-option]";
const MODAL = "[data-test-add-to-or-create-project-modal]";
const MODAL_HEADER = "[data-test-modal-header]";
const MODAL_BODY = "[data-test-modal-body]";
const MODAL_FOOTER = "[data-test-modal-footer]";
const FORM = "[data-test-project-form]";
const NEW_PROJECT_BUTTON = "[data-test-start-new-project-button]";
const SUBMIT_BUTTON = `${FORM} [data-test-submit]`;

interface Context extends MirageTestContext {
  onClose: () => void;
  onSave: (project: HermesProjectInfo) => void;
  document: HermesDocument;
}

module("Integration | Component | projects/add-to-or-create", function (hooks) {
  setupRenderingTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(async function (this: Context) {
    this.set("onClose", () => {});
    this.set("onSave", () => {});
    this.set("document", this.server.create("document"));
    this.server.create("related-hermes-document");
  });

  test("it shows a filterable list of available projects", async function (this: Context, assert) {
    this.server.create("project", { title: "Foo" });
    this.server.create("project", { title: "Bar" });
    this.server.create("project", {
      title: "Baz",
      status: ProjectStatus.Archived,
    });
    this.server.create("project", {
      title: "Qux",
      status: ProjectStatus.Completed,
    });

    await render<Context>(hbs`
      <Projects::AddToOrCreate
        @onClose={{this.onClose}}
        @onSave={{this.onSave}}
        @document={{this.document}}
      />
    `);

    assert.dom(OPTION).exists({ count: 2 }, "only active projects are shown");

    const firstOption = find(OPTION);
    const secondOption = findAll(OPTION)[1];

    assert.dom(firstOption).hasText("Foo");
    assert.dom(secondOption).hasText("Bar");

    await fillIn("input", "b");

    assert.dom(OPTION).exists({ count: 1 });
    assert.dom(OPTION).hasText("Bar");
  });

  test("you can add a doc to a new project", async function (this: Context, assert) {
    await render<Context>(hbs`
      <Projects::AddToOrCreate
        @onClose={{this.onClose}}
        @onSave={{this.onSave}}
        @document={{this.document}}
      />
    `);

    assert.dom(MODAL).hasClass("search-window");
    assert.dom(MODAL_HEADER).hasText("Add doc to project");
    assert.dom(MODAL_BODY).hasClass("h-[350px]");
    assert.dom(MODAL_FOOTER).exists();
    assert.dom(FORM).doesNotExist();

    await click(NEW_PROJECT_BUTTON);

    assert.dom(MODAL).doesNotHaveClass("search-window");
    assert.dom(MODAL_HEADER).hasText("Start a project");
    assert.dom(MODAL_BODY).hasClass("h-[calc(350px+69px)]");
    assert.dom(MODAL_FOOTER).doesNotExist();
    assert.dom(FORM).exists();

    const uniqueTitle = "1iodfanlkj";

    await fillIn("[data-test-title]", uniqueTitle);
    await click(SUBMIT_BUTTON);

    const project = this.server.schema.projects.findBy({ title: uniqueTitle });
    const document = this.server.schema.document.first();

    assert.true(document.projects.includes(project.id.toString()));

    assert.equal(project.hermesDocuments[0].id, document.id);
  });

  test("it runs the onClose action", async function (this: Context, assert) {
    let count = 0;
    this.set("onClose", () => count++);

    await render<Context>(hbs`
      <Projects::AddToOrCreate
        @onClose={{this.onClose}}
        @onSave={{this.onSave}}
        @document={{this.document}}
      />
    `);

    await triggerKeyEvent("input", "keydown", "Escape");

    assert.equal(count, 1);
  });
});
