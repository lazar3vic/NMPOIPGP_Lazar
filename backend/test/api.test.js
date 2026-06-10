const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');

test('GET /api/health returns ok', async () => {
  const response = await request(app).get('/api/health');
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'ok');
});

test('GET /api/layers/dynamic-world validates year', async () => {
  const response = await request(app).get('/api/layers/dynamic-world?year=2010');
  assert.equal(response.status, 400);
});

test('GET /api/statistics returns 9 classes', async () => {
  const response = await request(app).get('/api/statistics?year=2025');
  assert.equal(response.status, 200);
  assert.equal(response.body.length, 9);
});

test('GET /api/change returns change layers', async () => {
  const response = await request(app).get('/api/change?from=2016&to=2025');
  assert.equal(response.status, 200);
  assert.equal(response.body.from, 2016);
  assert.equal(response.body.to, 2025);
  assert.equal(response.body.built_expansion_layer.type, 'FeatureCollection');
});
