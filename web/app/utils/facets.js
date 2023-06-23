/**
 * mapKeys.
 *
 * @param Object obj
 * @param Function mapper
 *
 * Iterates over the properties on an object calling mapper on each value.
 *
 * mapKeys({ residence: 'house', footwear: 'shoes' }, x => 'boat'+x)
 * // { residence: 'boathouse', footwear: 'boatshoes' }
 */
export const mapKeys = (obj, mapper) =>
  Object.entries(obj).reduce((newObj, [key, val]) => {
    newObj[key] = mapper(val);
    return newObj;
  }, {});

/**
 * statefulFacet.
 *
 * @param Object facet
 * Iterates over the keys of a facet object and transforms the count value
 * to an object that has count and selected properties
 */
export const statefulFacet = (facet) =>
  mapKeys(facet, (count) => ({ count, isSelected: false }));

export const markSelected = (facet, selection) =>
  (selection || []).forEach((param) => (facet[param].isSelected = true));
