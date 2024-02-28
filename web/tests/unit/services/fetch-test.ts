import { module, test } from "qunit";
import { setupTest } from "ember-qunit";
import FetchService, { BAD_RESPONSE_LABEL } from "hermes/services/fetch";

module("Unit | Service | fetch", function (hooks) {
  setupTest(hooks);

  test("the getErrorCode method words", function (assert) {
    const fetchSvc = this.owner.lookup("service:fetch") as FetchService;

    const generateError = (code: number) => {
      return new Error(`${BAD_RESPONSE_LABEL}${code}: some message`);
    };

    let error = generateError(400);

    assert.equal(fetchSvc.getErrorCode(error), 400);

    error = generateError(500);

    assert.equal(fetchSvc.getErrorCode(error), 500);

    error = new Error("error - 404: some message");

    assert.equal(
      fetchSvc.getErrorCode(error),
      undefined,
      "incorrectly formatted errors are ignored",
    );

    error = new Error(`${BAD_RESPONSE_LABEL}z404: some message`);

    assert.equal(
      fetchSvc.getErrorCode(error),
      undefined,
      "non-numeric error codes are ignored",
    );

    error = new Error();

    assert.equal(
      fetchSvc.getErrorCode(error),
      undefined,
      "errors without a message are ignored",
    );
  });
});
