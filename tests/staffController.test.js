'use strict';

const fs = require('fs');
const path = require('path');
const Account = require('../models/Account');
const Order = require('../models/Order');
const Product = require('../models/Product');
const staffCtrl = require('../controllers/staffController');

const accountsFile = path.join(__dirname, '..', 'data', 'accounts.json');
const ordersFile = path.join(__dirname, '..', 'data', 'orders.json');
const productsFile = path.join(__dirname, '..', 'data', 'products.json');
const accountsBackup = accountsFile + '.bak';
const ordersBackup = ordersFile + '.bak';
const productsBackup = productsFile + '.bak';

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.send = jest.fn(() => res);
  res.render = jest.fn(() => res);
  res.redirect = jest.fn(() => res);
  return res;
}

beforeAll(() => {
  if (fs.existsSync(accountsFile)) fs.copyFileSync(accountsFile, accountsBackup);
  if (fs.existsSync(ordersFile)) fs.copyFileSync(ordersFile, ordersBackup);
  if (fs.existsSync(productsFile)) fs.copyFileSync(productsFile, productsBackup);
});

afterAll(() => {
  if (fs.existsSync(accountsBackup)) {
    fs.copyFileSync(accountsBackup, accountsFile);
    fs.unlinkSync(accountsBackup);
  }
  if (fs.existsSync(ordersBackup)) {
    fs.copyFileSync(ordersBackup, ordersFile);
    fs.unlinkSync(ordersBackup);
  }
  if (fs.existsSync(productsBackup)) {
    fs.copyFileSync(productsBackup, productsFile);
    fs.unlinkSync(productsBackup);
  }
});

beforeEach(() => {
  fs.writeFileSync(accountsFile, '[]');
  fs.writeFileSync(ordersFile, '[]');
  if (fs.existsSync(productsBackup)) fs.copyFileSync(productsBackup, productsFile);
});

afterEach(() => {
  fs.writeFileSync(accountsFile, '[]');
  fs.writeFileSync(ordersFile, '[]');
  if (fs.existsSync(productsBackup)) fs.copyFileSync(productsBackup, productsFile);
  jest.restoreAllMocks();
});

describe('staffController', () => {
  test('showProducts renders staff product list', () => {
    const req = { session: { cart: { items: {} } } };
    const res = mockRes();

    staffCtrl.showProducts(req, res);

    expect(res.render).toHaveBeenCalledWith('staff-products', expect.objectContaining({
      products: expect.any(Array),
      cartCount: 0,
    }));
  });

  test('showNewProduct renders empty product form', () => {
    const req = { session: { cart: { items: {} } } };
    const res = mockRes();

    staffCtrl.showNewProduct(req, res);

    expect(res.render).toHaveBeenCalledWith('staff-product-form', expect.objectContaining({
      action: '/staff/products',
      title: 'New Product',
      error: null,
    }));
  });

  test('createProduct redirects after a valid product', () => {
    const req = {
      session: { cart: { items: {} } },
      body: {
        name: 'Unit Test Product',
        price: '19.99',
        image: '/images/bolt-shirt.svg',
        category: 'Apparel',
        type: 'T-Shirt',
        badge: 'New',
        desc: 'Created by a unit test.',
      },
    };
    const res = mockRes();

    staffCtrl.createProduct(req, res);

    expect(res.redirect).toHaveBeenCalledWith('/staff/products');
    expect(Product.getAll().some(product => product.name === 'Unit Test Product')).toBe(true);
  });

  test('createProduct re-renders form when validation fails', () => {
    const req = {
      session: { cart: { items: {} } },
      body: {
        name: '',
        price: '19.99',
        image: '/images/bolt-shirt.svg',
        category: 'Apparel',
        type: 'T-Shirt',
        badge: 'New',
        desc: 'Missing name should fail.',
      },
    };
    const res = mockRes();

    staffCtrl.createProduct(req, res);

    expect(res.render).toHaveBeenCalledWith('staff-product-form', expect.objectContaining({
      title: 'New Product',
      error: 'Product name is required.',
    }));
  });

  test('showEditProduct returns 404 when product is missing', () => {
    const req = { params: { id: '999999' }, session: { cart: { items: {} } } };
    const res = mockRes();

    staffCtrl.showEditProduct(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith('Product not found.');
  });

  test('updateProduct saves changes and redirects', () => {
    const product = Product.create({
      name: 'Update Test Product',
      price: 22,
      image: '/images/bolt-shirt.svg',
      category: 'Apparel',
      type: 'Hoodie',
      badge: 'New',
      desc: 'Original description.',
    });
    const req = {
      params: { id: String(product.id) },
      session: { cart: { items: {} } },
      body: {
        name: 'Update Test Product v2',
        price: '23.50',
        image: '/images/bolt-shirt.svg',
        category: 'Apparel',
        type: 'Hoodie',
        badge: 'Sale',
        desc: 'Updated description.',
      },
    };
    const res = mockRes();

    staffCtrl.updateProduct(req, res);

    expect(res.redirect).toHaveBeenCalledWith('/staff/products');
    expect(Product.getById(product.id).name).toBe('Update Test Product v2');
  });

  test('deleteProduct removes product and redirects', () => {
    const product = Product.create({
      name: 'Delete Test Product',
      price: 14,
      image: '/images/bolt-shirt.svg',
      category: 'Accessories',
      type: 'Mug',
      badge: 'Sale',
      desc: 'Product to delete.',
    });
    const req = { params: { id: String(product.id) } };
    const res = mockRes();

    staffCtrl.deleteProduct(req, res);

    expect(res.redirect).toHaveBeenCalledWith('/staff/products');
    expect(Product.getById(product.id)).toBeUndefined();
  });

  test('showCustomerOrderForm renders customers and products', () => {
    Account.add({
      name: 'Customer Test',
      email: 'customer-test@example.com',
      password: 'Secret123!',
      address: '1 Test Street',
    });
    const req = { session: { cart: { items: {} } } };
    const res = mockRes();

    staffCtrl.showCustomerOrderForm(req, res);

    expect(res.render).toHaveBeenCalledWith('staff-order-form', expect.objectContaining({
      customers: expect.arrayContaining([expect.objectContaining({ email: 'customer-test@example.com' })]),
      products: expect.any(Array),
      cartCount: 0,
    }));
  });

  test('placeCustomerOrder creates an order for the customer', () => {
    const customer = Account.add({
      name: 'Buyer Test',
      email: 'buyer-test@example.com',
      password: 'Secret123!',
      address: '2 Test Avenue',
    });
    const product = Product.getById(1);
    const req = {
      session: {
        user: { id: 500, email: 'staff@example.com' },
        cart: { items: {} },
      },
      body: {
        customerId: String(customer.id),
        productId: String(product.id),
        qty: '2',
        name: 'Buyer Test',
        address: '2 Test Avenue',
      },
    };
    const res = mockRes();

    staffCtrl.placeCustomerOrder(req, res);

    expect(res.render).toHaveBeenCalledWith('order-complete', expect.objectContaining({
      order: expect.objectContaining({
        userId: customer.id,
        createdByStaffEmail: 'staff@example.com',
      }),
    }));
    expect(Order.getByUserId(customer.id)).toHaveLength(1);
  });

  test('placeCustomerOrder surfaces validation errors', () => {
    const req = {
      session: {
        user: { id: 500, email: 'staff@example.com' },
        cart: { items: {} },
      },
      body: {
        customerId: '999999',
        productId: '1',
        qty: '1',
      },
    };
    const res = mockRes();

    staffCtrl.placeCustomerOrder(req, res);

    expect(res.render).toHaveBeenCalledWith('staff-order-form', expect.objectContaining({
      error: 'Customer account not found.',
      form: expect.objectContaining({ customerId: '999999' }),
    }));
  });
});