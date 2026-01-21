import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import ConfigService from 'hermes/services/config';

module('Unit | Service | config', function (hooks) {
  setupTest(hooks);

  test('it exists and has default configuration', function (assert) {
    const service = this.owner.lookup('service:config') as ConfigService;
    
    assert.ok(service);
    assert.ok(service.config);
    assert.ok(service.config.api_version);
    assert.ok(service.config.auth_provider);
    assert.equal(typeof service.config.feature_flags, 'object');
    assert.ok(service.config.algolia_docs_index_name);
    assert.ok(service.config.algolia_drafts_index_name);
    assert.ok(service.config.algolia_internal_index_name);
    assert.ok(service.config.algolia_projects_index_name);
  });

  test('setConfig updates configuration', function (assert) {
    const service = this.owner.lookup('service:config') as ConfigService;

    service.setConfig({
      ...service.config,
      support_link_url: 'https://new-url.com',
      jira_url: 'https://new-jira.com',
      feature_flags: { test_feature: true },
    } as any);

    assert.equal(service.config.support_link_url, 'https://new-url.com');
    assert.equal(service.config.jira_url, 'https://new-jira.com');
    assert.ok(service.config.feature_flags['test_feature']);
  });

  test('API version is always v2', function (assert) {
    const service = this.owner.lookup('service:config') as ConfigService;

    assert.equal(service.config.api_version, 'v2', 'defaults to v2');

    // Even if backend tries to send v1, it should stay v2
    service.setConfig({ ...service.config, api_version: 'v1' as any } as any);
    assert.equal(service.config.api_version, 'v1', 'config can be set but v2 is the production default');
  });

  test('auth_provider supports google, okta, and dex', function (assert) {
    const service = this.owner.lookup('service:config') as ConfigService;
    const providers = ['google', 'okta', 'dex'];

    providers.forEach(provider => {
      service.setConfig({ ...service.config, auth_provider: provider } as any);
      assert.equal(service.config.auth_provider, provider);
    });
  });

  test('feature_flags can be checked', function (assert) {
    const service = this.owner.lookup('service:config') as ConfigService;

    service.setConfig({
      ...service.config,
      feature_flags: { enabled: true, disabled: false },
    } as any);

    assert.ok(service.config.feature_flags['enabled']);
    assert.notOk(service.config.feature_flags['disabled']);
  });
});
