'use strict';

const fs = require('fs');
const path = require('path');
const Product = require('../models/Product');

const dataFile = path.join(__dirname, '..', 'data', 'products.json');
const backup = path.join(__dirname, '..', 'data', 'products.json.bak');

const NEW_PRODUCT = {
  name:     'Staff Test Hoodie',
  price:    24.5,
  image:    '/images/bolt-shirt.svg',
  category: 'Apparel',
  type:     'Hoodie',
  badge:    'New',
  desc:     'A hoodie added by the staff test.',
};

beforeAll(() => {
  if (fs.existsSync(dataFile)) fs.copyFileSync(dataFile, backup);
});

afterAll(() => {
  if (fs.existsSync(backup)) {
    fs.copyFileSync(backup, dataFile);
    fs.unlinkSync(backup);
  }
});

beforeEach(() => {
  if (fs.existsSync(backup)) fs.copyFileSync(backup, dataFile);
});

afterEach(() => {
  if (fs.existsSync(backup)) fs.copyFileSync(backup, dataFile);
});

describe('Product model', () => {
  test('getAll returns all products', () => {
    const products = Product.getAll();
    expect(products).toBeInstanceOf(Array);
    expect(products.length).toBeGreaterThanOrEqual(6);
  });

  test('getById returns the correct product', () => {
    const product = Product.getById(1);
    expect(product).toBeDefined();
    expect(product.id).toBe(1);
    expect(product.name).toContain('Sauce Labs Backpack');
  });

  test('getById returns undefined for missing product', () => {
    expect(Product.getById(999)).toBeUndefined();
  });

  test('getCategories returns unique categories', () => {
    const categories = Product.getCategories();
    expect(Array.isArray(categories)).toBe(true);
    expect(new Set(categories).size).toBe(categories.length);
    expect(categories).toEqual(expect.arrayContaining(['Accessories', 'Apparel', 'Outdoor']));
  });

  test('getTypes returns unique types from JSON', () => {
    const types = Product.getTypes();
    expect(Array.isArray(types)).toBe(true);
    expect(new Set(types).size).toBe(types.length);
    expect(types).toEqual(expect.arrayContaining(['Backpack', 'T-Shirt', 'Onesie']));
  });

  test('create adds a product to products.json', () => {
    const countBefore = Product.getAll().length;
    const created = Product.create(NEW_PRODUCT);

    expect(created.id).toBeDefined();
    expect(created).toMatchObject({ name: NEW_PRODUCT.name, price: 24.5 });
    expect(Product.getAll()).toHaveLength(countBefore + 1);
    expect(Product.getById(created.id).name).toBe(NEW_PRODUCT.name);
  });

  test('update changes an existing product', () => {
    const created = Product.create(NEW_PRODUCT);
    const updated = Product.update(created.id, { ...NEW_PRODUCT, name: 'Updated Hoodie', price: '30.75' });

    expect(updated.name).toBe('Updated Hoodie');
    expect(updated.price).toBe(30.75);
    expect(Product.getById(created.id).name).toBe('Updated Hoodie');
  });

  test('delete removes an existing product', () => {
    const created = Product.create(NEW_PRODUCT);
    const removed = Product.delete(created.id);

    expect(removed.name).toBe(NEW_PRODUCT.name);
    expect(Product.getById(created.id)).toBeUndefined();
  });

  test('create validates required fields', () => {
    expect(() => Product.create({ ...NEW_PRODUCT, name: '' })).toThrow('Product name is required.');
    expect(() => Product.create({ ...NEW_PRODUCT, price: 'nope' })).toThrow('Product price must be a valid number.');
  });
});
