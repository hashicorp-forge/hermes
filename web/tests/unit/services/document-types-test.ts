import { module, test } from "qunit";
import { setupTest } from "ember-qunit";
import { MirageTestContext, setupMirage } from "ember-cli-mirage/test-support";
import DocumentTypesService from "hermes/services/document-types";

module("Unit | Service | document-types", function (hooks) {
  setupTest(hooks);
  setupMirage(hooks);

  test("it exists", function (assert) {
    const service = this.owner.lookup("service:document-types") as DocumentTypesService;
    assert.ok(service);
  });

  test("fetch task loads document types", async function (this: MirageTestContext, assert) {
    const service = this.owner.lookup("service:document-types") as DocumentTypesService;

    await service.fetch.perform();

    assert.ok(service.index, "index is populated");
    assert.ok(service.index!.length > 0, "loads document types from mirage");
    assert.equal(service.index![0]?.name, "RFC");
  });

  test("getFlightIcon returns icon for document type", async function (assert) {
    const service = this.owner.lookup("service:document-types") as DocumentTypesService;
    
    service.index = [
      { name: "RFC", flightIcon: "file-text" } as any,
      { name: "PRD", flightIcon: "file" } as any
    ];

    assert.equal(service.getFlightIcon("RFC"), "file-text");
    assert.equal(service.getFlightIcon("PRD"), "file");
    assert.equal(service.getFlightIcon("Unknown"), undefined);
  });
});
