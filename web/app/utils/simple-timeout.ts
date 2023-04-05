/**
 * A timeout function for polling tasks.
 * Not registered with Ember's runloop
 * (unlike ember-concurrency's timeout helper),
 * so it doesn't hang in acceptance tests.
 *
 * See: https://ember-concurrency.com/docs/testing-debugging
 */

export default function simpleTimeout(timeout: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, timeout);
  });
}
