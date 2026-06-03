'use strict';

const fs       = require('fs');
const path     = require('path');
const request  = require('supertest');
const createApp = require('../app');
const Account  = require('../models/Account');
const Order    = require('../models/Order');
const Product  = require('../models/Product');

const accountsFile = path.join(__dirname, '..', 'data', 'accounts.json');
const ordersFile   = path.join(__dirname, '..', 'data', 'orders.json');
const productsFile = path.join(__dirname, '..', 'data', 'products.json');
const accBackup    = accountsFile + '.bak';
const ordBackup    = ordersFile   + '.bak';
const prodBackup   = productsFile + '.bak';

let app;

beforeAll(() => {
  if (fs.existsSync(accountsFile)) fs.copyFileSync(accountsFile, accBackup);
  if (fs.existsSync(ordersFile))   fs.copyFileSync(ordersFile,   ordBackup);
  if (fs.existsSync(productsFile)) fs.copyFileSync(productsFile, prodBackup);
  app = createApp();
});

afterAll(() => {
  if (fs.existsSync(accBackup)) { fs.copyFileSync(accBackup, accountsFile); fs.unlinkSync(accBackup); }
  if (fs.existsSync(ordBackup)) { fs.copyFileSync(ordBackup, ordersFile);   fs.unlinkSync(ordBackup); }
  if (fs.existsSync(prodBackup)) { fs.copyFileSync(prodBackup, productsFile); fs.unlinkSync(prodBackup); }
});

beforeEach(() => {
  fs.writeFileSync(accountsFile, '[]');
  fs.writeFileSync(ordersFile, '[]');
  if (fs.existsSync(prodBackup)) fs.copyFileSync(prodBackup, productsFile);
});
afterEach(() => {
  fs.writeFileSync(accountsFile, '[]');
  fs.writeFileSync(ordersFile, '[]');
  if (fs.existsSync(prodBackup)) fs.copyFileSync(prodBackup, productsFile);
});

// ── Helper: login agent ───────────────────────────────────────
async function loginAgent(email, password, role = 'customer') {
  const agent = request.agent(app);
  Account.add({ name: 'Test', email, password, address: '1 St', role });
  await agent.post('/login').send(`email=${email}&password=${password}`);
  return agent;
}

// ── GET / ─────────────────────────────────────────────────────
describe('GET /', () => {
  test('returns 200 and renders shop page', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/SwagStore|Sauce Labs/i);
  });

  test('accepts category query filter', async () => {
    const res = await request(app).get('/?category=Apparel');
    expect(res.status).toBe(200);
  });

  test('accepts sort query', async () => {
    const res = await request(app).get('/?sort=price-asc');
    expect(res.status).toBe(200);
  });
});

// ── Cart ──────────────────────────────────────────────────────
describe('Cart routes', () => {
  test('GET /cart returns 200', async () => {
    const res = await request(app).get('/cart');
    expect(res.status).toBe(200);
  });

  test('POST /cart/add adds product and redirects', async () => {
    const agent = request.agent(app);
    const res   = await agent.post('/cart/add').send('productId=1');
    expect(res.status).toBe(302);
  });

  test('POST /cart/add returns 404 for invalid product', async () => {
    const res = await request(app).post('/cart/add').send('productId=9999');
    expect(res.status).toBe(404);
  });

  test('POST /cart/update changes quantity', async () => {
    const agent = request.agent(app);
    await agent.post('/cart/add').send('productId=1');
    const res = await agent.post('/cart/update').send('productId=1&qty=3');
    expect(res.status).toBe(302);
  });

  test('POST /cart/remove removes item', async () => {
    const agent = request.agent(app);
    await agent.post('/cart/add').send('productId=1');
    const res = await agent.post('/cart/remove').send('productId=1');
    expect(res.status).toBe(302);
  });

  test('POST /cart/clear empties cart', async () => {
    const agent = request.agent(app);
    await agent.post('/cart/add').send('productId=1');
    await agent.post('/cart/add').send('productId=2');
    const res = await agent.post('/cart/clear');
    expect(res.status).toBe(302);
    const cartPage = await agent.get('/cart');
    expect(cartPage.text).toMatch(/empty|trống|no items/i);
  });
});

// ── Auth: Register ────────────────────────────────────────────
describe('Auth: Register', () => {
  test('GET /register returns 200', async () => {
    const res = await request(app).get('/register');
    expect(res.status).toBe(200);
  });

  test('POST /register with valid data redirects to /login', async () => {
    const res = await request(app).post('/register').send(
      'name=New+User&email=new@test.com&password=secure&address=123+St'
    );
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/login/);
  });

  test('POST /register with missing fields re-renders form with error', async () => {
    const res = await request(app).post('/register').send(
      'name=&email=&password=&address='
    );
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/fill in all|required/i);
  });

  test('POST /register with duplicate email shows error', async () => {
    Account.add({ name: 'A', email: 'dup@test.com', password: 'p', address: 'a' });
    const res = await request(app).post('/register').send(
      'name=B&email=dup@test.com&password=x&address=b'
    );
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/already registered/i);
  });
});

// ── Auth: Login / Logout ──────────────────────────────────────
describe('Auth: Login', () => {
  test('GET /login returns 200', async () => {
    expect((await request(app).get('/login')).status).toBe(200);
  });

  test('POST /login with valid credentials redirects', async () => {
    Account.add({ name: 'Alice', email: 'alice@x.com', password: 'pass', address: '1' });
    const agent = request.agent(app);
    const res   = await agent.post('/login').send('email=alice@x.com&password=pass');
    expect(res.status).toBe(302);
  });

  test('POST /login with wrong password re-renders with error', async () => {
    Account.add({ name: 'Alice', email: 'alice@x.com', password: 'pass', address: '1' });
    const res = await request(app).post('/login').send('email=alice@x.com&password=wrong');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/invalid/i);
  });

  test('POST /login with empty body shows field error', async () => {
    const res = await request(app).post('/login').send('email=&password=');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/fill in/i);
  });

  test('GET /logout removes session and redirects to /', async () => {
    const agent = await loginAgent('user@x.com', 'pass');
    const res   = await agent.get('/logout');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');
  });
});

// ── Protected routes ──────────────────────────────────────────
describe('Protected routes (require login)', () => {
  test('GET /checkout redirects to /login when not logged in', async () => {
    const res = await request(app).get('/checkout');
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/login/);
  });

  test('GET /orders redirects to /login when not logged in', async () => {
    const res = await request(app).get('/orders');
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/login/);
  });

  test('GET /profile redirects to /login when not logged in', async () => {
    const res = await request(app).get('/profile');
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/login/);
  });
});

// ── Checkout + Order flow ─────────────────────────────────────
describe('Staff routes', () => {
  const PRODUCT_FORM = 'name=Staff+Mug&price=12.50&image=/images/bolt-shirt.svg&category=Accessories&type=Mug&badge=New&desc=Created+by+staff';

  test('GET /staff/products redirects to login when not logged in', async () => {
    const res = await request(app).get('/staff/products');
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/login/);
  });

  test('customer account cannot access staff products', async () => {
    const agent = await loginAgent('customer@x.com', 'pass');
    const res = await agent.get('/staff/products');
    expect(res.status).toBe(403);
    expect(res.text).toMatch(/staff access/i);
  });

  test('staff can create, update, and delete products', async () => {
    const agent = await loginAgent('staff@x.com', 'pass', 'staff');

    const listRes = await agent.get('/staff/products');
    expect(listRes.status).toBe(200);
    expect(listRes.text).toMatch(/Staff Products/i);

    const newFormRes = await agent.get('/staff/products/new');
    expect(newFormRes.status).toBe(200);
    expect(newFormRes.text).toMatch(/New Product/i);

    const createRes = await agent.post('/staff/products').send(PRODUCT_FORM);
    expect(createRes.status).toBe(302);
    expect(createRes.headers.location).toBe('/staff/products');

    const created = Product.getAll().find(p => p.name === 'Staff Mug');
    expect(created).toBeDefined();

    const updateRes = await agent
      .post(`/staff/products/${created.id}`)
      .send('name=Staff+Mug+Updated&price=14.25&image=/images/bolt-shirt.svg&category=Accessories&type=Mug&badge=Sale&desc=Updated+by+staff');
    expect(updateRes.status).toBe(302);
    expect(Product.getById(created.id).name).toBe('Staff Mug Updated');

    const deleteRes = await agent.post(`/staff/products/${created.id}/delete`);
    expect(deleteRes.status).toBe(302);
    expect(Product.getById(created.id)).toBeUndefined();
  });

  test('staff can place an order for a customer', async () => {
    const staff = await loginAgent('staff-order@x.com', 'pass', 'staff');
    const customer = Account.add({
      name: 'Buyer Customer',
      email: 'buyer-customer@x.com',
      password: 'pass',
      address: 'Customer Address',
    });

    const formRes = await staff.get('/staff/orders/new');
    expect(formRes.status).toBe(200);
    expect(formRes.text).toMatch(/Order for Customer/i);

    const res = await staff
      .post('/staff/orders')
      .send(`customerId=${customer.id}&productId=1&qty=2&name=Buyer+Customer&address=Customer+Address`);

    expect(res.status).toBe(200);
    expect(res.text).toMatch(/ORD-STAFF-/);

    const orders = Order.getByUserId(customer.id);
    expect(orders).toHaveLength(1);
    expect(orders[0]).toMatchObject({
      userId:              customer.id,
      email:               'buyer-customer@x.com',
      createdByStaffEmail: 'staff-order@x.com',
    });
    expect(orders[0].items[0].qty).toBe(2);
  });
});

describe('Checkout & Order flow', () => {
  test('GET /checkout redirects to /cart when logged in but cart empty', async () => {
    const agent = await loginAgent('buyer@x.com', 'pass');
    const res   = await agent.get('/checkout');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/cart');
  });

  test('GET /checkout renders page when logged in with cart items', async () => {
    const agent = await loginAgent('buyer2@x.com', 'pass');
    await agent.post('/cart/add').send('productId=1');
    const res = await agent.get('/checkout');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/checkout|order|address/i);
  });

  test('POST /checkout places order, clears cart, renders success', async () => {
    const agent = await loginAgent('buyer3@x.com', 'pass');
    await agent.post('/cart/add').send('productId=1');
    await agent.post('/cart/add').send('productId=2');
    const res = await agent.post('/checkout').send('name=Buyer&address=10+St');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/ORD-|order.*complete|thank/i);
  });

  test('GET /orders shows order history after placing order', async () => {
    const agent = await loginAgent('history@x.com', 'pass');
    await agent.post('/cart/add').send('productId=3');
    await agent.post('/checkout').send('name=H&address=Addr');
    const res = await agent.get('/orders');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/ORD-/);
  });
});
