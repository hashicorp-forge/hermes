import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import FetchService, { BAD_RESPONSE_LABEL } from 'hermes/services/fetch';
import { MockConfigService, MockSessionService } from 'hermes/tests/helpers/mock-services';
import sinon from 'sinon';

module('Unit | Service | fetch', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    // Register mock services
    this.owner.register('service:config', MockConfigService);
    this.owner.register('service:session', MockSessionService);
  });

  test('it exists', function (assert) {
    const service = this.owner.lookup('service:fetch') as FetchService;
    assert.ok(service, 'fetch service exists');
  });

  test('getErrorCode extracts status code from error message', function (assert) {
    const service = this.owner.lookup('service:fetch') as FetchService;

    const error404 = new Error(`${BAD_RESPONSE_LABEL}404: Not Found`);
    assert.equal(
      service.getErrorCode(error404),
      404,
      'extracts 404 status code'
    );

    const error500 = new Error(`${BAD_RESPONSE_LABEL}500: Server Error`);
    assert.equal(
      service.getErrorCode(error500),
      500,
      'extracts 500 status code'
    );

    const error401 = new Error(`${BAD_RESPONSE_LABEL}401: Unauthorized`);
    assert.equal(
      service.getErrorCode(error401),
      401,
      'extracts 401 status code'
    );
  });

  test('getErrorCode returns undefined for non-bad-response errors', function (assert) {
    const service = this.owner.lookup('service:fetch') as FetchService;

    const regularError = new Error('Some random error');
    assert.equal(
      service.getErrorCode(regularError),
      undefined,
      'returns undefined for non-bad-response errors'
    );
  });

  test('getErrorCode returns undefined for malformed error messages', function (assert) {
    const service = this.owner.lookup('service:fetch') as FetchService;

    const malformedError = new Error(`${BAD_RESPONSE_LABEL}not-a-number`);
    assert.equal(
      service.getErrorCode(malformedError),
      undefined,
      'returns undefined for non-numeric error code'
    );
  });

  test('fetch adds Google auth header for Google provider', async function (assert) {
    const service = this.owner.lookup('service:fetch') as FetchService;
    const configService = this.owner.lookup('service:config') as MockConfigService;
    const sessionService = this.owner.lookup('service:session') as MockSessionService;

    configService.config.auth_provider = 'google';
    sessionService.data.authenticated.access_token = 'test-google-token';

    // Mock the global fetch
    const fetchStub = sinon.stub(window, 'fetch').resolves(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    try {
      await service.fetch('/api/v2/me');

      assert.ok(fetchStub.calledOnce, 'fetch was called once');
      const [, options] = fetchStub.firstCall.args as any;
      assert.equal(
        options.headers['Hermes-Google-Access-Token'],
        'test-google-token',
        'Google auth header was added'
      );
    } finally {
      fetchStub.restore();
    }
  });

  test('fetch adds Bearer token for OIDC providers (okta)', async function (assert) {
    const service = this.owner.lookup('service:fetch') as FetchService;
    const configService = this.owner.lookup('service:config') as MockConfigService;
    const sessionService = this.owner.lookup('service:session') as MockSessionService;

    configService.config.auth_provider = 'okta';
    sessionService.data.authenticated.access_token = 'test-okta-token';

    const fetchStub = sinon.stub(window, 'fetch').resolves(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    try {
      await service.fetch('/api/v2/me');

      assert.ok(fetchStub.calledOnce, 'fetch was called once');
      const [, options] = fetchStub.firstCall.args as any;
      assert.equal(
        options.headers['Authorization'],
        'Bearer test-okta-token',
        'Bearer token was added for Okta'
      );
    } finally {
      fetchStub.restore();
    }
  });

  test('fetch adds Bearer token for OIDC providers (dex)', async function (assert) {
    const service = this.owner.lookup('service:fetch') as FetchService;
    const configService = this.owner.lookup('service:config') as MockConfigService;
    const sessionService = this.owner.lookup('service:session') as MockSessionService;

    configService.config.auth_provider = 'dex';
    sessionService.data.authenticated.access_token = 'test-dex-token';

    const fetchStub = sinon.stub(window, 'fetch').resolves(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    try {
      await service.fetch('/api/v2/me');

      assert.ok(fetchStub.calledOnce, 'fetch was called once');
      const [, options] = fetchStub.firstCall.args as any;
      assert.equal(
        options.headers['Authorization'],
        'Bearer test-dex-token',
        'Bearer token was added for Dex'
      );
    } finally {
      fetchStub.restore();
    }
  });

  test('fetch does not add auth headers for external URLs', async function (assert) {
    const service = this.owner.lookup('service:fetch') as FetchService;
    const sessionService = this.owner.lookup('service:session') as MockSessionService;

    sessionService.data.authenticated.access_token = 'test-token';

    const fetchStub = sinon.stub(window, 'fetch').resolves(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    try {
      await service.fetch('https://external-api.example.com/data');

      assert.ok(fetchStub.calledOnce, 'fetch was called once');
      const [, options] = fetchStub.firstCall.args as any;
      assert.notOk(
        options.headers,
        'no auth headers added for external URLs'
      );
    } finally {
      fetchStub.restore();
    }
  });

  test('fetch does not override existing auth headers', async function (assert) {
    const service = this.owner.lookup('service:fetch') as FetchService;
    const sessionService = this.owner.lookup('service:session') as MockSessionService;

    sessionService.data.authenticated.access_token = 'test-token';

    const fetchStub = sinon.stub(window, 'fetch').resolves(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    try {
      await service.fetch('/api/v2/me', {
        headers: {
          Authorization: 'Bearer custom-token',
        },
      });

      assert.ok(fetchStub.calledOnce, 'fetch was called once');
      const [, options] = fetchStub.firstCall.args as any;
      assert.equal(
        options.headers['Authorization'],
        'Bearer custom-token',
        'existing auth header was preserved'
      );
    } finally {
      fetchStub.restore();
    }
  });

  test('fetch handles 401 responses during polling', async function (assert) {
    const service = this.owner.lookup('service:fetch') as FetchService;
    const sessionService = this.owner.lookup('service:session') as MockSessionService;

    const fetchStub = sinon.stub(window, 'fetch').resolves(
      new Response('Unauthorized', {
        status: 401,
        statusText: 'Unauthorized',
      })
    );

    try {
      const result = await service.fetch('/api/v2/me', {}, true);

      assert.equal(result, undefined, 'poll call with 401 returns undefined');
      assert.ok(
        sessionService.pollResponseIs401,
        'session service was notified of 401'
      );
    } finally {
      fetchStub.restore();
    }
  });

  test('fetch throws error for non-401 bad responses', async function (assert) {
    const service = this.owner.lookup('service:fetch') as FetchService;

    const fetchStub = sinon.stub(window, 'fetch').resolves(
      new Response('Server Error', {
        status: 500,
        statusText: 'Internal Server Error',
      })
    );

    try {
      await service.fetch('/api/v2/me');
      assert.ok(false, 'should have thrown an error');
    } catch (error: any) {
      assert.ok(
        error.message.includes('500'),
        'error message includes status code'
      );
      assert.ok(
        error.message.startsWith(BAD_RESPONSE_LABEL),
        'error message has bad response label'
      );
    } finally {
      fetchStub.restore();
    }
  });

  test('fetch handles successful responses', async function (assert) {
    const service = this.owner.lookup('service:fetch') as FetchService;

    const mockData = { user: 'test', email: 'test@example.com' };
    const fetchStub = sinon.stub(window, 'fetch').resolves(
      new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    try {
      const response = await service.fetch('/api/v2/me');

      assert.ok(response, 'response is returned');
      assert.ok(response instanceof Response, 'response is a Response object');

      if (response) {
        const data = await response.json();
        assert.deepEqual(data, mockData, 'response data matches mock data');
      }
    } finally {
      fetchStub.restore();
    }
  });

  test('fetch handles network errors during polling', async function (assert) {
    const service = this.owner.lookup('service:fetch') as FetchService;
    const sessionService = this.owner.lookup('service:session') as MockSessionService;

    const fetchStub = sinon.stub(window, 'fetch').rejects(
      new TypeError('Network request failed')
    );

    try {
      await service.fetch('/api/v2/me', {}, true);

      assert.ok(
        sessionService.pollResponseIs401,
        'poll network error sets pollResponseIs401'
      );
    } finally {
      fetchStub.restore();
    }
  });

  test('fetch sets pollResponseIs401 false for successful poll calls', async function (assert) {
    const service = this.owner.lookup('service:fetch') as FetchService;
    const sessionService = this.owner.lookup('service:session') as MockSessionService;

    // Start with it being true
    sessionService.pollResponseIs401 = true;

    const fetchStub = sinon.stub(window, 'fetch').resolves(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    try {
      await service.fetch('/api/v2/me', {}, true);

      assert.notOk(
        sessionService.pollResponseIs401,
        'successful poll sets pollResponseIs401 to false'
      );
    } finally {
      fetchStub.restore();
    }
  });

  test('fetch can make POST requests with body', async function (assert) {
    const service = this.owner.lookup('service:fetch') as FetchService;

    const fetchStub = sinon.stub(window, 'fetch').resolves(
      new Response(JSON.stringify({ created: true }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const postData = { title: 'New Document', docType: 'RFC' };

    try {
      await service.fetch('/api/v2/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });

      assert.ok(fetchStub.calledOnce, 'fetch was called once');
      const [url, options] = fetchStub.firstCall.args as any;
      assert.equal(url, '/api/v2/documents', 'correct URL was used');
      assert.equal(options.method, 'POST', 'POST method was used');
      assert.ok(options.body, 'body was included');
    } finally {
      fetchStub.restore();
    }
  });
});
