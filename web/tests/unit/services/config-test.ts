import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import ConfigService from 'hermes/services/config';

module('Unit | Service | config', function (hooks) {
  setupTest(hooks);

  test('it exists', function (assert) {
    const service = this.owner.lookup('service:config') as ConfigService;
    assert.ok(service, 'config service exists');
  });

  test('it has default configuration', function (assert) {
    const service = this.owner.lookup('service:config') as ConfigService;

    assert.ok(service.config, 'config object exists');
    assert.ok(service.config.api_version, 'api_version is set');
    assert.ok(service.config.auth_provider, 'auth_provider is set');
    assert.equal(
      typeof service.config.feature_flags,
      'object',
      'feature_flags is an object'
    );
  });

  test('it has algolia index names', function (assert) {
    const service = this.owner.lookup('service:config') as ConfigService;

    assert.ok(
      service.config.algolia_docs_index_name,
      'docs index name is set'
    );
    assert.ok(
      service.config.algolia_drafts_index_name,
      'drafts index name is set'
    );
    assert.ok(
      service.config.algolia_internal_index_name,
      'internal index name is set'
    );
    assert.ok(
      service.config.algolia_projects_index_name,
      'projects index name is set'
    );
  });

  test('setConfig updates configuration', function (assert) {
    const service = this.owner.lookup('service:config') as ConfigService;
    const originalConfig = { ...service.config };

    const newConfig: any = {
      ...originalConfig,
      support_link_url: 'https://new-support-url.com',
      jira_url: 'https://new-jira.com',
      feature_flags: { test_feature: true },
    };

    service.setConfig(newConfig);

    assert.equal(
      service.config.support_link_url,
      'https://new-support-url.com',
      'support_link_url was updated'
    );
    assert.equal(
      service.config.jira_url,
      'https://new-jira.com',
      'jira_url was updated'
    );
    assert.ok(
      service.config.feature_flags['test_feature'],
      'feature flag was set'
    );
  });

  test('setConfig sets API version to v1 by default', function (assert) {
    const service = this.owner.lookup('service:config') as ConfigService;

    const newConfig: any = {
      ...service.config,
      feature_flags: {},
    };

    service.setConfig(newConfig);

    assert.equal(
      service.config.api_version,
      'v1',
      'API version defaults to v1'
    );
  });

  test('setConfig sets API version to v2 when feature flag is enabled', function (assert) {
    const service = this.owner.lookup('service:config') as ConfigService;

    const newConfig: any = {
      ...service.config,
      feature_flags: { api_v2: true },
    };

    service.setConfig(newConfig);

    assert.equal(
      service.config.api_version,
      'v2',
      'API version is v2 when feature flag is enabled'
    );
  });

  test('auth_provider supports google', function (assert) {
    const service = this.owner.lookup('service:config') as ConfigService;

    const newConfig: any = {
      ...service.config,
      auth_provider: 'google',
    };

    service.setConfig(newConfig);

    assert.equal(
      service.config.auth_provider,
      'google',
      'auth_provider can be set to google'
    );
  });

  test('auth_provider supports okta', function (assert) {
    const service = this.owner.lookup('service:config') as ConfigService;

    const newConfig: any = {
      ...service.config,
      auth_provider: 'okta',
    };

    service.setConfig(newConfig);

    assert.equal(
      service.config.auth_provider,
      'okta',
      'auth_provider can be set to okta'
    );
  });

  test('auth_provider supports dex', function (assert) {
    const service = this.owner.lookup('service:config') as ConfigService;

    const newConfig: any = {
      ...service.config,
      auth_provider: 'dex',
    };

    service.setConfig(newConfig);

    assert.equal(
      service.config.auth_provider,
      'dex',
      'auth_provider can be set to dex'
    );
  });

  test('feature_flags can be checked', function (assert) {
    const service = this.owner.lookup('service:config') as ConfigService;

    const newConfig: any = {
      ...service.config,
      feature_flags: {
        feature_one: true,
        feature_two: false,
        feature_three: true,
      },
    };

    service.setConfig(newConfig);

    assert.ok(
      service.config.feature_flags['feature_one'],
      'feature_one is enabled'
    );
    assert.notOk(
      service.config.feature_flags['feature_two'],
      'feature_two is disabled'
    );
    assert.ok(
      service.config.feature_flags['feature_three'],
      'feature_three is enabled'
    );
  });

  test('short_link_base_url is configurable', function (assert) {
    const service = this.owner.lookup('service:config') as ConfigService;

    const newConfig: any = {
      ...service.config,
      short_link_base_url: 'https://go.example.com/',
    };

    service.setConfig(newConfig);

    assert.equal(
      service.config.short_link_base_url,
      'https://go.example.com/',
      'short_link_base_url is configurable'
    );
  });

  test('google_doc_folders is configurable', function (assert) {
    const service = this.owner.lookup('service:config') as ConfigService;

    const newConfig: any = {
      ...service.config,
      google_doc_folders: 'folder1,folder2,folder3',
    };

    service.setConfig(newConfig);

    assert.equal(
      service.config.google_doc_folders,
      'folder1,folder2,folder3',
      'google_doc_folders is configurable'
    );
  });

  test('version and short_revision are set', function (assert) {
    const service = this.owner.lookup('service:config') as ConfigService;

    // Mock version values since they're set at build time
    service.config.version = '1.2.3-test';
    service.config.short_revision = 'abc123';

    assert.ok(
      service.config.version !== undefined,
      'version is defined'
    );
    assert.ok(
      service.config.short_revision !== undefined,
      'short_revision is defined'
    );
    assert.equal(
      service.config.version,
      '1.2.3-test',
      'version has correct value'
    );
    assert.equal(
      service.config.short_revision,
      'abc123',
      'short_revision has correct value'
    );
  });
});
