const express = require('express');
const cors = require('cors');
const {
  SOMBOR_CENTER,
  CLASSES,
  YEARS,
  WORLDCOVER,
  aggregateStats,
  getDynamicWorldLayer,
  getPointSeries,
  getChange,
} = require('./data');
const {
  getDynamicWorldTileUrl,
  getWorldCoverTileUrl,
} = require('./gee');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/config', (_req, res) => {
  res.json({
    center: { lon: SOMBOR_CENTER[0], lat: SOMBOR_CENTER[1] },
    zoom: 11,
    available_years: YEARS,
    classes: CLASSES,
  });
});

app.get('/api/classes', (_req, res) => {
  res.json(CLASSES);
});

app.get('/api/years', (_req, res) => {
  res.json(YEARS);
});

app.get('/api/layers/dynamic-world', (req, res) => {
  const year = Number(req.query.year);
  if (!YEARS.includes(year)) {
    return res.status(400).json({ error: 'Year must be between 2016 and 2025.' });
  }

  return res.json(getDynamicWorldLayer(year));
});

app.get('/api/layers/worldcover', (_req, res) => {
  res.json(WORLDCOVER);
});

app.get('/api/tiles/dynamic-world', async (req, res) => {
  try {
    const year = Number(req.query.year);

    if (!YEARS.includes(year)) {
      return res.status(400).json({
        error: 'Year must be between 2016 and 2025.',
      });
    }

    const tile = await getDynamicWorldTileUrl(year);
    return res.json(tile);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: 'Could not generate Dynamic World tile URL.',
    });
  }
});

app.get('/api/tiles/worldcover', async (_req, res) => {
  try {
    const tile = await getWorldCoverTileUrl();
    return res.json(tile);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: 'Could not generate ESA WorldCover tile URL.',
    });
  }
});

app.get('/api/statistics', (req, res) => {
  const year = Number(req.query.year);
  if (!YEARS.includes(year)) {
    return res.status(400).json({ error: 'Year must be between 2016 and 2025.' });
  }

  return res.json(aggregateStats(year));
});

app.get('/api/change', (req, res) => {
  const from = Number(req.query.from);
  const to = Number(req.query.to);

  if (!YEARS.includes(from) || !YEARS.includes(to) || to < from) {
    return res.status(400).json({ error: 'Use valid years (2016-2025) and ensure to >= from.' });
  }

  return res.json(getChange(from, to));
});

app.get('/api/point', (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return res.status(400).json({ error: 'lat and lng query params are required.' });
  }

  return res.json(getPointSeries(lat, lng));
});

module.exports = app;
