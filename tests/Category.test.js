'use strict';

const Category = require('../models/Category');
const categoriesJson = require('../data/categories.json');

describe('Category model', () => {
  test('getAll returns all categories from JSON', () => {
    const categories = Category.getAll();
    expect(Array.isArray(categories)).toBe(true);
    expect(categories.length).toBeGreaterThanOrEqual(1);
    expect(categories).toEqual(expect.arrayContaining(['Accessories', 'Outdoor', 'Apparel']));
  });

  test('getAll returns the same values as categories data file', () => {
    expect(Category.getAll()).toEqual(categoriesJson);
  });

  test('categories are unique non-empty strings', () => {
    const categories = Category.getAll();
    expect(new Set(categories).size).toBe(categories.length);
    categories.forEach(category => {
      expect(typeof category).toBe('string');
      expect(category.trim()).toBe(category);
      expect(category.length).toBeGreaterThan(0);
    });
  });
});
