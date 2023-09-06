import timeAgo from "hermes/utils/time-ago";
import { module, test } from "qunit";
import MockDate from "mockdate";

module("Unit | Utility | time-ago", function () {
  test('it returns a "time ago" value for a date', function (assert) {
    MockDate.set("2000-01-01T06:00:00.000-07:00");

    const now = Date.now();

    assert.equal("5 seconds ago", timeAgo(now - 5000));
    assert.equal("1 minute ago", timeAgo(now - 60000));
    assert.equal("5 hours ago", timeAgo(now - 18000000));
    assert.equal("3 months ago", timeAgo(now - 7776000000));
    assert.equal("2 years ago", timeAgo(now - 63072000000));

    MockDate.reset();
  });
});
