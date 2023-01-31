import { module, todo } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Unit | Route | index', function(hooks) {
  setupTest(hooks);

  todo('it exists', function(assert) {
    let route = this.owner.lookup('route:index');
    assert.ok(route);
  });
});
