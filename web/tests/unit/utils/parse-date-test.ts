import parseDate from "hermes/utils/parse-date";
import { module, test } from "qunit";
import MockDate from "mockdate";

module("Unit | Utility | parse-date", function () {
  // Make sure the date is always the same
  // TODO: Freeze timezone
  MockDate.set("2000-01-01T06:00:00.000-07:00");

  test("it parses dates", function (assert) {
    // Valid
    assert.equal(parseDate(628021800000), "25 Nov. 1989");
    assert.equal(parseDate("12/23/20", "long"), "23 December 2020");
    assert.equal(parseDate("1980/12/20"), "20 Dec. 1980");
    assert.equal(parseDate("November 21, 1963", "long"), "21 November 1963");
    assert.equal(parseDate("November 21, 1963 12:30"), "21 Nov. 1963");
    assert.equal(parseDate("2000-01-01T06:00:00.000-07:00"), "1 Jan. 2000");

    // Invalid
    assert.equal(parseDate(undefined), null);
    assert.equal(parseDate("628021800000"), null);
    assert.equal(parseDate("4 days ago"), null);

    MockDate.reset();
  });
});
