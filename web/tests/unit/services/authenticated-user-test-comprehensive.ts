import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import AuthenticatedUserService from 'hermes/services/authenticated-user';
import { MockConfigService, MockFetchService, MockSessionService } from 'hermes/tests/helpers/mock-services';
import StoreService from 'hermes/services/store';
import sinon from 'sinon';

module('Unit | Service | authenticated-user', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    // Register mock services
    this.owner.register('service:config', MockConfigService);
    this.owner.register('service:fetch', MockFetchService);
    this.owner.register('service:session', MockSessionService);
  });

  test('it exists', function (assert) {
    const service = this.owner.lookup('service:authenticated-user') as AuthenticatedUserService;
    assert.ok(service, 'authenticated-user service exists');
  });

  test('info returns null when not loaded', function (assert) {
    const service = this.owner.lookup('service:authenticated-user') as AuthenticatedUserService;
    
    assert.equal(service.info, null, 'info is null before loading');
  });

  test('subscriptions starts as null', function (assert) {
    const service = this.owner.lookup('service:authenticated-user') as AuthenticatedUserService;
    
    assert.equal(service.subscriptions, null, 'subscriptions is null initially');
  });

  test('loadInfo fetches user information from store', async function (assert) {
    const service = this.owner.lookup('service:authenticated-user') as AuthenticatedUserService;
    const store = this.owner.lookup('service:store') as StoreService;

    // Mock the store's findAll method
    const mockPerson = {
      id: 'test-user-id',
      email: 'testuser@example.com',
      name: 'Test User',
    };

    const mockMe = {
      id: 'test-user-id',
      firstObject: mockPerson,
    };

    const findAllStub = sinon.stub(store, 'findAll').resolves(mockMe as any);
    const peekRecordStub = sinon.stub(store, 'peekRecord').returns(mockPerson as any);

    try {
      await service.loadInfo.perform();

      assert.ok(findAllStub.calledWith('me'), 'store.findAll was called with "me"');
      assert.ok(peekRecordStub.calledWith('person', 'test-user-id'), 'store.peekRecord was called');
      assert.ok(service.info, 'info was set');
      assert.equal(service.info?.id, 'test-user-id', 'user id is correct');
    } finally {
      findAllStub.restore();
      peekRecordStub.restore();
    }
  });

  test('loadInfo throws error when user fetch fails', async function (assert) {
    const service = this.owner.lookup('service:authenticated-user') as AuthenticatedUserService;
    const store = this.owner.lookup('service:store') as StoreService;

    const findAllStub = sinon.stub(store, 'findAll').rejects(new Error('Network error'));

    try {
      await service.loadInfo.perform();
      assert.ok(false, 'should have thrown an error');
    } catch (error: any) {
      assert.ok(true, 'error was thrown');
      assert.ok(error.message.includes('Network error'), 'error message is preserved');
    } finally {
      findAllStub.restore();
    }
  });

  test('fetchSubscriptions loads subscriptions from API', async function (assert) {
    const service = this.owner.lookup('service:authenticated-user') as AuthenticatedUserService;
    const fetchService = this.owner.lookup('service:fetch') as MockFetchService;
    const configService = this.owner.lookup('service:config') as MockConfigService;

    configService.config.api_version = 'v2';

    const mockSubscriptions = ['Product Area 1', 'Product Area 2', 'Product Area 3'];
    fetchService.setMockResponse(
      '/api/v2/me/subscriptions',
      mockSubscriptions
    );

    await service.fetchSubscriptions.perform();

    assert.ok(service.subscriptions, 'subscriptions were loaded');
    assert.equal(service.subscriptions?.length, 3, 'correct number of subscriptions');
    assert.equal(
      service.subscriptions?.[0]?.productArea ?? '',
      'Product Area 1',
      'first subscription is correct'
    );
    assert.equal(
      service.subscriptions?.[1]?.productArea ?? '',
      'Product Area 2',
      'second subscription is correct'
    );
    assert.equal(
      service.subscriptions?.[2]?.productArea ?? '',
      'Product Area 3',
      'third subscription is correct'
    );
  });

  test('fetchSubscriptions handles empty subscription list', async function (assert) {
    const service = this.owner.lookup('service:authenticated-user') as AuthenticatedUserService;
    const fetchService = this.owner.lookup('service:fetch') as MockFetchService;

    fetchService.setMockResponse('/api/v2/me/subscriptions', []);

    await service.fetchSubscriptions.perform();

    assert.ok(service.subscriptions, 'subscriptions is not null');
    assert.equal(service.subscriptions?.length, 0, 'subscriptions array is empty');
  });

  test('fetchSubscriptions throws error on API failure', async function (assert) {
    const service = this.owner.lookup('service:authenticated-user') as AuthenticatedUserService;
    const fetchService = this.owner.lookup('service:fetch') as MockFetchService;

    fetchService.simulateFailure(500, 'Server Error');

    try {
      await service.fetchSubscriptions.perform();
      assert.ok(false, 'should have thrown an error');
    } catch (error: any) {
      assert.ok(true, 'error was thrown');
    }
  });

  test('addSubscription adds a new subscription', async function (assert) {
    const service = this.owner.lookup('service:authenticated-user') as AuthenticatedUserService;
    const fetchService = this.owner.lookup('service:fetch') as MockFetchService;

    // Initialize with existing subscriptions
    service.subscriptions = [
      { productArea: 'Existing Product', subscriptionType: 'instant' as any },
    ];

    fetchService.setMockResponse('/api/v2/me/subscriptions', { success: true });

    await service.addSubscription.perform('New Product Area');

    assert.equal(service.subscriptions?.length, 2, 'subscription was added');
    assert.equal(
      service.subscriptions?.[1]?.productArea ?? '',
      'New Product Area',
      'new subscription has correct product area'
    );
    assert.equal(
      service.subscriptions?.[1]?.subscriptionType ?? '',
      'instant',
      'new subscription defaults to instant type'
    );
  });

  test('addSubscription reverts on API failure', async function (assert) {
    const service = this.owner.lookup('service:authenticated-user') as AuthenticatedUserService;
    const fetchService = this.owner.lookup('service:fetch') as MockFetchService;

    // Initialize with existing subscriptions
    const originalSubscriptions = [
      { productArea: 'Existing Product', subscriptionType: 'instant' as any },
    ];
    service.subscriptions = [...originalSubscriptions];

    fetchService.simulateFailure(500, 'Server Error');

    try {
      await service.addSubscription.perform('New Product Area');
      assert.ok(false, 'should have thrown an error');
    } catch (error: any) {
      assert.ok(true, 'error was thrown');
      assert.equal(
        service.subscriptions?.length,
        1,
        'subscriptions were reverted to original state'
      );
      assert.equal(
        service.subscriptions?.[0]?.productArea ?? '',
        'Existing Product',
        'original subscription is preserved'
      );
    }
  });

  test('addSubscription sends POST request with correct body', async function (assert) {
    const service = this.owner.lookup('service:authenticated-user') as AuthenticatedUserService;
    const fetchService = this.owner.lookup('service:fetch') as MockFetchService;

    service.subscriptions = [
      { productArea: 'Product 1', subscriptionType: 'instant' as any },
    ];

    await service.addSubscription.perform('Product 2');

    const postCall = fetchService.fetchCalls.find(
      (call) => call.options?.method === 'POST'
    );

    assert.ok(postCall, 'POST request was made');
    assert.ok(postCall?.options?.body, 'request has body');
    
    const body = JSON.parse(postCall!.options!.body as string);
    assert.deepEqual(
      body.subscriptions,
      ['Product 1', 'Product 2'],
      'body contains all subscriptions'
    );
  });

  test('addSubscription uses correct API endpoint', async function (assert) {
    const service = this.owner.lookup('service:authenticated-user') as AuthenticatedUserService;
    const fetchService = this.owner.lookup('service:fetch') as MockFetchService;
    const configService = this.owner.lookup('service:config') as MockConfigService;

    configService.config.api_version = 'v2';
    service.subscriptions = [];

    await service.addSubscription.perform('Test Product');

    const postCall = fetchService.fetchCalls.find(
      (call) => call.options?.method === 'POST'
    );

    assert.ok(
      postCall?.url.includes('/api/v2/me/subscriptions'),
      'uses correct v2 API endpoint'
    );
  });

  test('addSubscription sets Content-Type header', async function (assert) {
    const service = this.owner.lookup('service:authenticated-user') as AuthenticatedUserService;
    const fetchService = this.owner.lookup('service:fetch') as MockFetchService;

    service.subscriptions = [];

    await service.addSubscription.perform('Test Product');

    const postCall = fetchService.fetchCalls.find(
      (call) => call.options?.method === 'POST'
    );

    const headers = postCall?.options?.headers as Record<string, string> | undefined;
    assert.equal(
      headers?.['Content-Type'],
      'application/json',
      'Content-Type header is set to application/json'
    );
  });

  test('multiple addSubscription calls work correctly', async function (assert) {
    const service = this.owner.lookup('service:authenticated-user') as AuthenticatedUserService;
    const fetchService = this.owner.lookup('service:fetch') as MockFetchService;

    service.subscriptions = [];

    await service.addSubscription.perform('Product 1');
    await service.addSubscription.perform('Product 2');
    await service.addSubscription.perform('Product 3');

    assert.equal(service.subscriptions?.length, 3, 'all subscriptions were added');
    assert.deepEqual(
      service.subscriptions?.map((s) => s.productArea),
      ['Product 1', 'Product 2', 'Product 3'],
      'subscriptions are in correct order'
    );
  });

  test('loadInfo task can be performed multiple times', async function (assert) {
    const service = this.owner.lookup('service:authenticated-user') as AuthenticatedUserService;
    const store = this.owner.lookup('service:store') as StoreService;

    const mockPerson = {
      id: 'test-user-id',
      email: 'testuser@example.com',
    };

    const mockMe = {
      id: 'test-user-id',
      firstObject: mockPerson,
    };

    const findAllStub = sinon.stub(store, 'findAll').resolves(mockMe as any);
    const peekRecordStub = sinon.stub(store, 'peekRecord').returns(mockPerson as any);

    try {
      await service.loadInfo.perform();
      await service.loadInfo.perform();
      await service.loadInfo.perform();

      assert.equal(findAllStub.callCount, 3, 'loadInfo was called 3 times');
      assert.ok(service.info, 'info is still set');
    } finally {
      findAllStub.restore();
      peekRecordStub.restore();
    }
  });

  test('fetchSubscriptions uses configured API version', async function (assert) {
    const service = this.owner.lookup('service:authenticated-user') as AuthenticatedUserService;
    const fetchService = this.owner.lookup('service:fetch') as MockFetchService;
    const configService = this.owner.lookup('service:config') as MockConfigService;

    configService.config.api_version = 'v1';
    fetchService.setMockResponse('/api/v1/me/subscriptions', []);

    await service.fetchSubscriptions.perform();

    const fetchCall = fetchService.fetchCalls[0];
    assert.ok(fetchCall, 'fetch was called');
    if (fetchCall) {
      assert.ok(
        fetchCall.url.includes('/api/v1/'),
        'uses v1 API when configured'
      );
    }

    // Test with v2
    fetchService.reset();
    configService.config.api_version = 'v2';
    fetchService.setMockResponse('/api/v2/me/subscriptions', []);

    await service.fetchSubscriptions.perform();

    const fetchCall2 = fetchService.fetchCalls[0];
    assert.ok(fetchCall2, 'fetch was called for v2');
    if (fetchCall2) {
      assert.ok(
        fetchCall2.url.includes('/api/v2/'),
        'uses v2 API when configured'
      );
    }
  });
});
