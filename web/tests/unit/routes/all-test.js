import { module, todo } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Unit | Route | all', function(hooks) {
  setupTest(hooks);

  todo('it exists', function(assert) {
    let route = this.owner.lookup('route:all');
    assert.ok(route);
  });
});
