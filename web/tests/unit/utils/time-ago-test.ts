import timeAgo from "hermes/utils/time-ago";
import { module, test } from "qunit";
import MockDate from "mockdate";
import { DEFAULT_MOCK_DATE } from "hermes/utils/mockdate/dates";

module("Unit | Utility | time-ago", function () {
  test('it returns a "time ago" value for a date', function (assert) {
    MockDate.set(DEFAULT_MOCK_DATE);

    const now = Date.now() / 1000;

    assert.strictEqual(timeAgo(now - 5), "5 seconds ago");
    assert.strictEqual(timeAgo(now - 60), "1 minute ago");
    assert.strictEqual(timeAgo(now - 300), "5 minutes ago");
    assert.strictEqual(timeAgo(now - 21600), "6 hours ago");
    assert.strictEqual(timeAgo(undefined), "Unknown date");

    assert.strictEqual(timeAgo(now - 5184000), "2 months ago");

    assert.strictEqual(
      timeAgo(now - 5184000, { limitTo24Hours: true }),
      "2 Nov. 1999",
    );

    assert.strictEqual(timeAgo(now - 63072000), "2 years ago");

    assert.strictEqual(
      timeAgo(now - 63072000, { limitTo24Hours: true }),
      "1 Jan. 1998",
    );

    MockDate.reset();
  });
});
