import timeAgo from "hermes/utils/time-ago";
import { module, test } from "qunit";
import MockDate from "mockdate";

module("Unit | Utility | time-ago", function () {
  test('it returns a "time ago" value for a date', function (assert) {
    MockDate.set("2000-01-01T06:00:00.000-07:00");

    const now = Date.now() / 1000;

    assert.equal("5 seconds ago", timeAgo(now - 5));
    assert.equal("1 minute ago", timeAgo(now - 60));
    assert.equal("5 minutes ago", timeAgo(now - 300));
    assert.equal("6 hours ago", timeAgo(now - 21600));
    assert.equal("2 months ago", timeAgo(now - 5184000));
    assert.equal("2 years ago", timeAgo(now - 63072000));

    MockDate.reset();
  });
});
