import { module, test } from "qunit";
import { setupTest } from "ember-qunit";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import { authenticateSession } from "ember-simple-auth/test-support";
import ActiveFiltersService, {
  DEFAULT_FILTERS,
} from "hermes/services/active-filters";

const INDEX = {
  docType: ["foo"],
  status: [],
  product: [],
  owners: [],
};

interface ActiveFiltersServiceTestContext extends MirageTestContext {
  activeFilters: ActiveFiltersService;
}

module("Unit | Service | active-filters", function (hooks) {
  setupTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(function () {
    authenticateSession({});

    const activeFilters = this.owner.lookup(
      "service:active-filters",
    ) as ActiveFiltersService;

    this.set("activeFilters", activeFilters);
  });

  test("it computes an `isEmpty` value", function (this: ActiveFiltersServiceTestContext, assert) {
    assert.equal(this.activeFilters.isEmpty, true);
    this.activeFilters.index = INDEX;
    assert.equal(this.activeFilters.isEmpty, false);
  });

  test("you can update the index", function (this: ActiveFiltersServiceTestContext, assert) {
    assert.deepEqual(this.activeFilters.index, DEFAULT_FILTERS);
    this.activeFilters.update(INDEX);
    assert.deepEqual(this.activeFilters.index, INDEX);
  });

  test("you can reset the index", function (this: ActiveFiltersServiceTestContext, assert) {
    this.activeFilters.index = INDEX;
    this.activeFilters.reset();
    assert.deepEqual(this.activeFilters.index, DEFAULT_FILTERS);
  });
});
