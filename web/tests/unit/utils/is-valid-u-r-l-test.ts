import isValidURL from "hermes/utils/is-valid-u-r-l";
import { module, test } from "qunit";

module("Unit | Utility | is-valid-u-r-l", function () {
  test("it returns whether a url is valid", function (assert) {
    const validURL = "https://www.google.com";
    const invalidURL = "xyz";

    assert.true(isValidURL(validURL));
    assert.false(isValidURL(invalidURL));
  });
});
