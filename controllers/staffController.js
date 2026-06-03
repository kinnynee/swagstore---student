'use strict';

const Account = require('../models/Account');
const Cart    = require('../models/Cart');
const Order   = require('../models/Order');
const Product = require('../models/Product');

function getCart(req) {
  return new Cart(req.session.cart || {});
}

function cartCount(req) {
  return getCart(req).count;
}

function renderProductForm(res, req, options = {}) {
  res.render('staff-product-form', {
    cartCount: cartCount(req),
    product:   options.product || {},
    action:    options.action,
    title:     options.title,
    error:     options.error || null,
  });
}

exports.showProducts = (req, res) => {
  res.render('staff-products', {
    cartCount: cartCount(req),
    products:  Product.getAll(),
  });
};

exports.showNewProduct = (req, res) => {
  renderProductForm(res, req, {
    action: '/staff/products',
    title:  'New Product',
  });
};

exports.createProduct = (req, res) => {
  try {
    Product.create(req.body);
    res.redirect('/staff/products');
  } catch (err) {
    renderProductForm(res, req, {
      action:  '/staff/products',
      title:   'New Product',
      product: req.body,
      error:   err.message,
    });
  }
};

exports.showEditProduct = (req, res) => {
  const product = Product.getById(req.params.id);
  if (!product) return res.status(404).send('Product not found.');

  renderProductForm(res, req, {
    action:  `/staff/products/${product.id}`,
    title:   'Edit Product',
    product,
  });
};

exports.updateProduct = (req, res) => {
  try {
    Product.update(req.params.id, req.body);
    res.redirect('/staff/products');
  } catch (err) {
    const product = Product.getById(req.params.id) || { id: req.params.id, ...req.body };
    renderProductForm(res, req, {
      action:  `/staff/products/${req.params.id}`,
      title:   'Edit Product',
      product,
      error:   err.message,
    });
  }
};

exports.deleteProduct = (req, res) => {
  try {
    Product.delete(req.params.id);
    res.redirect('/staff/products');
  } catch (err) {
    res.status(404).send(err.message);
  }
};

exports.showCustomerOrderForm = (req, res) => {
  res.render('staff-order-form', {
    cartCount: cartCount(req),
    customers: Account.getCustomers(),
    products:  Product.getAll(),
  });
};

exports.placeCustomerOrder = (req, res) => {
  try {
    const customer = Account.findById(req.body.customerId);
    if (!customer || Account.isStaff(customer)) {
      throw new Error('Customer account not found.');
    }

    const product = Product.getById(req.body.productId);
    if (!product) {
      throw new Error('Product not found.');
    }

    const qty = Number(req.body.qty || 1);
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new Error('Quantity must be a positive whole number.');
    }

    const subtotal = +(product.price * qty).toFixed(2);
    const tax = +(subtotal * 0.08).toFixed(2);
    const total = +(subtotal + tax).toFixed(2);
    const order = {
      id:                  'ORD-STAFF-' + Date.now(),
      userId:              customer.id,
      email:               customer.email,
      items:               [{ product, qty, subtotal }],
      subtotal,
      tax,
      total,
      name:                req.body.name || customer.name,
      address:             req.body.address || customer.address,
      placedAt:            new Date().toLocaleString('vi-VN'),
      createdByStaffId:    req.session.user.id,
      createdByStaffEmail: req.session.user.email,
    };

    Order.add(order);
    res.render('order-complete', { order, cartCount: cartCount(req) });
  } catch (err) {
    res.render('staff-order-form', {
      cartCount: cartCount(req),
      customers: Account.getCustomers(),
      products:  Product.getAll(),
      form:      req.body,
      error:     err.message,
    });
  }
};
