import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import {
  RecentlyViewedDoc,
  RecentlyViewedProject,
} from "hermes/services/recently-viewed";
import { TEST_USER_EMAIL } from "hermes/mirage/utils";
import MockDate from "mockdate";
import { DEFAULT_MOCK_DATE } from "hermes/utils/mockdate/dates";

const ITEM = "[data-test-recently-viewed-item]";
const DOC_STATUS_ICON = "[data-test-document-status-icon]";
const PROJECT_STATUS_ICON = "[data-test-project-status-icon]";
const TYPE_LABEL = "[data-test-recently-viewed-item-type]";
const PERSON_AVATAR = "[data-test-person-avatar]";
const ADDITIONAL_PRODUCT_COUNT = "[data-test-additional-product-count]";
const PRODUCT_AVATAR = "[data-test-product-avatar]";
const TITLE = "[data-test-recently-viewed-item-title]";
const DOC_NUMBER = "[data-test-recently-viewed-doc-number]";
const MODIFIED_TIME = "[data-test-recently-viewed-item-modified-time]";

interface Context extends MirageTestContext {
  item: RecentlyViewedDoc | RecentlyViewedProject;
}

module(
  "Integration | Component | dashboard/recently-viewed/item",
  function (hooks) {
    setupRenderingTest(hooks);
    setupMirage(hooks);

    test("it renders correctly (doc)", async function (this: Context, assert) {
      MockDate.set(DEFAULT_MOCK_DATE);

      const oneHourAgoInSeconds = Date.now() / 1000 - 60 * 60;

      const id = "100";
      const objectID = id;
      const status = "Approved";
      const owner = TEST_USER_EMAIL;
      const docType = "FRD";
      const product = "Terraform";
      const title = "My Document";
      const docNumber = "MY-123";
      const modifiedTime = oneHourAgoInSeconds;

      this.server.create("document", {
        id,
        isDraft: false,
        objectID,
        status,
        owner,
        docType,
        product,
        title,
        docNumber,
        modifiedTime,
      });

      this.server.create("recently-viewed-doc", { id });

      this.set("item", this.server.schema.recentlyViewedDocs.find(id));

      await render<Context>(
        hbs`<Dashboard::RecentlyViewed::Item @item={{this.item}} />`,
      );

      assert
        .dom(ITEM)
        .hasAttribute("href", `/document/${id}`, "href is correct");

      assert
        .dom(DOC_STATUS_ICON)
        .hasAttribute(
          "data-test-status",
          status,
          "correct statusIcon is shown",
        );

      assert.dom(TYPE_LABEL).hasText(docType, "docType label is correct");

      assert.dom(PERSON_AVATAR).exists("owner avatar is shown");

      assert
        .dom(PRODUCT_AVATAR)
        .exists({ count: 1 }, "product avatar is shown");

      assert.dom(TITLE).containsText(title, "title is correct");
      assert.dom(DOC_NUMBER).hasText(docNumber, "docNumber is correct");
      assert
        .dom(MODIFIED_TIME)
        .hasText("Modified 1 hour ago", "modifiedTime is correct");

      MockDate.reset();
    });

    test("it renders correctly (project)", async function (this: Context, assert) {
      MockDate.set(DEFAULT_MOCK_DATE);

      const twoHoursAgoInSeconds = Date.now() / 1000 - 60 * 60 * 2;

      const id = "200";
      const title = "My Project";
      const modifiedTime = twoHoursAgoInSeconds;
      const status = "Active";
      const products = ["Terraform", "Packer", "Vault"];

      this.server.create("project", {
        id,
        title,
        modifiedTime,
        status,
        products,
      });

      this.server.create("recently-viewed-project", { id });

      this.set("item", this.server.schema.recentlyViewedProjects.find(id));

      await render<Context>(
        hbs`<Dashboard::RecentlyViewed::Item @item={{this.item}} />`,
      );

      assert.dom(ITEM).hasAttribute("href", `/projects/${id}`);

      assert.dom(PROJECT_STATUS_ICON).hasAttribute("data-test-status", status);

      assert.dom(TYPE_LABEL).hasText("Project");

      assert.dom(PERSON_AVATAR).doesNotExist();

      assert
        .dom(PRODUCT_AVATAR)
        .exists({ count: 2 }, "product avatars are shown");

      assert
        .dom(ADDITIONAL_PRODUCT_COUNT)
        .hasText("+1", "additionalProductCount is shown");

      assert.dom(TITLE).hasText(title, "title is correct");

      assert
        .dom(MODIFIED_TIME)
        .hasText("Modified 2 hours ago", "modifiedTime is correct");

      MockDate.reset();
    });
  },
);
