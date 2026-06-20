const express = require('express');
const cors = require('cors');
const {
  SOMBOR_CENTER,
  CLASSES,
  YEARS,
  WORLDCOVER,
  getDynamicWorldLayer,
} = require('./data');
const {
  getDynamicWorldTileUrl,
  getWorldCoverTileUrl,
  getDynamicWorldStatistics,
  getDynamicWorldChange,
  getPointSeries,
  getBuiltExpansionTileUrl,
  getCropLossTileUrl,
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

app.get('/api/tiles/built-expansion', async (req, res) => {
  try {
    const fromYear = Number(req.query.from);
    const toYear = Number(req.query.to);

    if (!YEARS.includes(fromYear) || !YEARS.includes(toYear)) {
      return res.status(400).json({ error: 'Invalid year range.' });
    }

    const tile = await getBuiltExpansionTileUrl(fromYear, toYear);
    return res.json(tile);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: 'Could not generate built-area expansion tile URL.',
    });
  }
});

app.get('/api/tiles/crop-loss', async (req, res) => {
  try {
    const fromYear = Number(req.query.from);
    const toYear = Number(req.query.to);

    if (!YEARS.includes(fromYear) || !YEARS.includes(toYear)) {
      return res.status(400).json({ error: 'Invalid year range.' });
    }

    const tile = await getCropLossTileUrl(fromYear, toYear);
    return res.json(tile);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: 'Could not generate crop-loss tile URL.',
    });
  }
});

app.get('/api/statistics', async (req, res) => {
  try {
    const year = Number(req.query.year);

    if (!YEARS.includes(year)) {
      return res.status(400).json({ error: 'Invalid year.' });
    }

    const stats = await getDynamicWorldStatistics(year);
    return res.json(stats);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: 'Could not calculate Dynamic World statistics.',
    });
  }
});

app.get('/api/change', async (req, res) => {
  try {
    const fromYear = Number(req.query.from);
    const toYear = Number(req.query.to);

    if (!YEARS.includes(fromYear) || !YEARS.includes(toYear)) {
      return res.status(400).json({ error: 'Invalid year range.' });
    }

    const change = await getDynamicWorldChange(fromYear, toYear);
    return res.json(change);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: 'Could not calculate Dynamic World change.',
    });
  }
});

app.get('/api/point', async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: 'Invalid point coordinates.' });
    }

    const series = await getPointSeries(lat, lng);
    return res.json(series);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: 'Could not calculate point time series.',
    });
  }
});

module.exports = app;
