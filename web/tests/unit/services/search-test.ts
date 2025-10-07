import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import SearchService from 'hermes/services/search';

module('Unit | Service | search', function (hooks) {
  setupTest(hooks);

  test('it exists', function (assert) {
    const service = this.owner.lookup('service:search') as SearchService;
    assert.ok(service, 'search service exists');
  });

  test('it has correct constants', function (assert) {
    const service = this.owner.lookup('service:search') as SearchService;
    
    assert.ok(service);
    // Verify exported constants are accessible
    assert.equal(typeof service.searchIndex, 'object', 'searchIndex task exists');
    assert.equal(typeof service.clearCache, 'object', 'clearCache task exists');
    assert.equal(typeof service.getObject, 'object', 'getObject task exists');
    assert.equal(typeof service.search, 'object', 'search task exists');
    assert.equal(typeof service.getFacets, 'object', 'getFacets task exists');
    assert.equal(typeof service.getDocResults, 'object', 'getDocResults task exists');
    assert.equal(typeof service.getProjectResults, 'object', 'getProjectResults task exists');
    assert.equal(typeof service.searchForFacetValues, 'object', 'searchForFacetValues task exists');
  });

  test('mapStatefulFacetKeys transforms facet object correctly', function (assert) {
    const service = this.owner.lookup('service:search') as SearchService;
    
    const facetObject = {
      owners: {
        'test@hashicorp.com': 5,
        'user@hashicorp.com': 3
      },
      status: {
        'Approved': 10,
        'In-Review': 2
      }
    };

    const result = service.mapStatefulFacetKeys(facetObject);

    assert.ok(result.owners, 'owners facet exists');
    assert.ok(result.status, 'status facet exists');
    
    assert.equal(result.owners?.['test@hashicorp.com']?.count, 5, 'owner count is correct');
    assert.equal(result.owners?.['test@hashicorp.com']?.isSelected, false, 'owner is not selected by default');
    
    assert.equal(result.status?.['Approved']?.count, 10, 'status count is correct');
    assert.equal(result.status?.['Approved']?.isSelected, false, 'status is not selected by default');
  });

  test('markSelected marks facets as selected', function (assert) {
    const service = this.owner.lookup('service:search') as SearchService;
    
    const facet = {
      'Approved': { count: 10, isSelected: false },
      'In-Review': { count: 5, isSelected: false },
      'Obsolete': { count: 2, isSelected: false }
    };

    service.markSelected(facet, ['Approved', 'Obsolete']);

    assert.true(facet['Approved'].isSelected, 'Approved is selected');
    assert.false(facet['In-Review'].isSelected, 'In-Review is not selected');
    assert.true(facet['Obsolete'].isSelected, 'Obsolete is selected');
  });

  test('buildFacetFilters builds correct filter array', function (assert) {
    const service = this.owner.lookup('service:search') as SearchService;
    
    const params = {
      docType: ['RFC', 'PRD'],
      status: ['Approved'],
      product: ['Terraform']
    };

    const filters = service.buildFacetFilters(params, false);

    assert.ok(Array.isArray(filters), 'returns an array');
    assert.ok(filters.length > 0, 'has filters');
    
    // Check that filters are correctly formatted
    const hasDocTypeFilter = filters.some(f => 
      Array.isArray(f) && f.some(item => item.includes('docType:'))
    );
    const hasStatusFilter = filters.some(f => 
      Array.isArray(f) && f.some(item => item.includes('status:'))
    );
    const hasProductFilter = filters.some(f => 
      Array.isArray(f) && f.some(item => item.includes('product:'))
    );

    assert.true(hasDocTypeFilter, 'has docType filter');
    assert.true(hasStatusFilter, 'has status filter');
    assert.true(hasProductFilter, 'has product filter');
  });

  test('buildFacetFilters respects empty facetFilters param', function (assert) {
    const service = this.owner.lookup('service:search') as SearchService;
    
    const paramsWithEmptyFacetFilters = {
      docType: ['RFC'],
      facetFilters: []
    };

    const paramsWithoutFacetFilters = {
      docType: ['RFC']
    };

    const filtersWithEmpty = service.buildFacetFilters(paramsWithEmptyFacetFilters, false);
    const filtersNormal = service.buildFacetFilters(paramsWithoutFacetFilters, false);

    assert.equal(filtersWithEmpty.length, 0, 
      'empty facetFilters param means no filters should be built');
    assert.ok(filtersNormal.length > 0, 
      'without facetFilters param, filters are built normally');
  });
});
