'use strict';

const fs = require('fs');
const path = require('path');
const types = require('../data/types.json');
const Category = require('./Category');

const dataFile = path.join(__dirname, '..', 'data', 'products.json');

function readProducts() {
  try {
    const raw = fs.readFileSync(dataFile, 'utf8');
    const products = raw ? JSON.parse(raw) : [];
    return Array.isArray(products) ? products : [];
  } catch (_) {
    return [];
  }
}

function writeProducts(products) {
  const normalized = Array.isArray(products) ? products : [products];
  fs.writeFileSync(dataFile, JSON.stringify(normalized, null, 2));
}

function normalizeProduct(input, existing = {}) {
  const next = { ...existing, ...input };
  const price = Number(next.price);

  if (!next.name || !String(next.name).trim()) {
    throw new Error('Product name is required.');
  }
  if (!Number.isFinite(price) || price < 0) {
    throw new Error('Product price must be a valid number.');
  }
  if (!next.image || !String(next.image).trim()) {
    throw new Error('Product image is required.');
  }
  if (!next.category || !String(next.category).trim()) {
    throw new Error('Product category is required.');
  }
  if (!next.type || !String(next.type).trim()) {
    throw new Error('Product type is required.');
  }
  if (!next.desc || !String(next.desc).trim()) {
    throw new Error('Product description is required.');
  }

  return {
    ...next,
    id:       Number(existing.id || next.id),
    name:     String(next.name).trim(),
    price:    +price.toFixed(2),
    image:    String(next.image).trim(),
    category: String(next.category).trim(),
    type:     String(next.type).trim(),
    badge:    next.badge ? String(next.badge).trim() : null,
    desc:     String(next.desc).trim(),
  };
}

class Product {
  static getAll()      { return readProducts(); }
  static getById(id)   { return Product.getAll().find(p => p.id === Number(id)); }
  static getCategories() {
    const defaults = Category.getAll();
    const fromProducts = Product.getAll().map(p => p.category).filter(Boolean);
    return Array.from(new Set([...defaults, ...fromProducts]));
  }
  static getTypes() {
    const fromProducts = Product.getAll().map(p => p.type).filter(Boolean);
    return Array.from(new Set([...types, ...fromProducts]));
  }

  static create(fields) {
    const products = Product.getAll();
    const nextId = products.reduce((max, p) => Math.max(max, Number(p.id) || 0), 0) + 1;
    const product = normalizeProduct({ ...fields, id: nextId });
    products.push(product);
    writeProducts(products);
    return product;
  }

  static update(id, fields) {
    const products = Product.getAll();
    const idx = products.findIndex(p => p.id === Number(id));
    if (idx === -1) throw new Error('Product not found.');

    const product = normalizeProduct(fields, products[idx]);
    products[idx] = product;
    writeProducts(products);
    return product;
  }

  static delete(id) {
    const products = Product.getAll();
    const idx = products.findIndex(p => p.id === Number(id));
    if (idx === -1) throw new Error('Product not found.');

    const [removed] = products.splice(idx, 1);
    writeProducts(products);
    return removed;
  }
}

module.exports = Product;
