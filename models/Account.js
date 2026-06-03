'use strict';

const fs     = require('fs');
const path   = require('path');
const bcrypt = require('bcryptjs');

const dataFile = path.join(__dirname, '..', 'data', 'accounts.json');
const ROLES = ['customer', 'staff'];

function readAccounts() {
  try {
    const raw = fs.readFileSync(dataFile, 'utf8');
    const accounts = raw ? JSON.parse(raw) : [];
    return Array.isArray(accounts) ? accounts : [];
  } catch (_) {
    return [];
  }
}

function writeAccounts(accounts) {
  const normalized = Array.isArray(accounts) ? accounts : [accounts];
  fs.writeFileSync(dataFile, JSON.stringify(normalized, null, 2));
}

function normalizeRole(role) {
  const normalized = String(role || 'customer').trim().toLowerCase();
  return ROLES.includes(normalized) ? normalized : 'customer';
}

class Account {
  static get roles() {
    return ROLES.slice();
  }

  static getAll() {
    return readAccounts();
  }

  static getCustomers() {
    return Account.getAll().filter(a => normalizeRole(a.role) === 'customer');
  }

  static isStaff(account) {
    return normalizeRole(account?.role) === 'staff';
  }

  static findByEmail(email) {
    return Account.getAll().find(a => a.email === String(email).trim().toLowerCase());
  }

  static findById(id) {
    return Account.getAll().find(a => String(a.id) === String(id));
  }

  static hashPassword(password) {
    return bcrypt.hashSync(String(password), 10);
  }

  static verifyPassword(password, hash) {
    // support old sha256 hashes (hex, 64 chars) for backward compat
    if (/^[a-f0-9]{64}$/.test(hash)) {
      const crypto = require('crypto');
      return crypto.createHash('sha256').update(String(password)).digest('hex') === hash;
    }
    return bcrypt.compareSync(String(password), hash);
  }

  static authenticate(email, password) {
    const user = Account.findByEmail(email);
    if (!user) return null;
    return Account.verifyPassword(password, user.passwordHash) ? user : null;
  }

  static add({ name, email, password, address, role }) {
    const normalizedEmail = String(email).trim().toLowerCase();
    if (!name || !normalizedEmail || !password || !address) {
      throw new Error('All fields are required.');
    }
    if (Account.findByEmail(normalizedEmail)) {
      throw new Error('Email already registered.');
    }

    const accounts  = Account.getAll();
    const nextId = Math.max(
      Date.now(),
      accounts.reduce((max, a) => Math.max(max, Number(a.id) || 0), 0) + 1
    );
    const newAccount = {
      id:           nextId,
      name:         String(name).trim(),
      email:        normalizedEmail,
      address:      String(address).trim(),
      passwordHash: Account.hashPassword(password),
      role:         normalizeRole(role),
      createdAt:    new Date().toISOString(),
    };
    accounts.push(newAccount);
    writeAccounts(accounts);
    return newAccount;
  }

  static update(id, fields) {
    const accounts = Account.getAll();
    const idx = accounts.findIndex(a => String(a.id) === String(id));
    if (idx === -1) throw new Error('Account not found.');
    const nextFields = { ...fields };
    if (Object.prototype.hasOwnProperty.call(nextFields, 'role')) {
      nextFields.role = normalizeRole(nextFields.role);
    }
    accounts[idx] = { ...accounts[idx], ...nextFields, updatedAt: new Date().toISOString() };
    writeAccounts(accounts);
    return accounts[idx];
  }
}

module.exports = Account;
