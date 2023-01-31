import parseDate from "hermes/utils/parse-date";
import { module, test } from "qunit";
import MockDate from "mockdate";

module("Unit | Utility | parse-date", function () {
  // Make sure the date is always the same
  MockDate.set("2000-01-01T06:00:00.000-07:00");

  test("it parses dates", function (assert) {
    // Valid
    assert.equal(parseDate(1), "12/31/1969");
    assert.equal(parseDate(628021800000), "11/25/1989");
    assert.equal(parseDate(628021800000 * 100), "2/14/3960");
    assert.equal(parseDate("12/23/20"), "12/23/2020");
    assert.equal(parseDate("1980/12/20"), "12/20/1980");
    assert.equal(parseDate("November 21, 1963"), "11/21/1963");
    assert.equal(parseDate("November 21, 1963 12:30"), "11/21/1963");
    assert.equal(parseDate("2000-01-01T06:00:00.000-07:00"), "1/1/2000");

    // Invalid
    assert.equal(parseDate(undefined), null);
    assert.equal(parseDate("628021800000"), null);
    assert.equal(parseDate("4 days ago"), null);
  });
});
