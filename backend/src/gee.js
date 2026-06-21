const ee = require('@google/earthengine');

const DW_PROBABILITY_BANDS = [
  'water',
  'trees',
  'grass',
  'flooded_vegetation',
  'crops',
  'shrub_and_scrub',
  'built',
  'bare',
  'snow_and_ice',
];

const DW_CLASSES = [
  { class_id: 0, key: 'water', class_name: 'Water', name: 'Water', color: '#419BDF' },
  { class_id: 1, key: 'trees', class_name: 'Trees', name: 'Trees', color: '#397D49' },
  { class_id: 2, key: 'grass', class_name: 'Grass', name: 'Grass', color: '#88B053' },
  { class_id: 3, key: 'flooded_vegetation', class_name: 'Flooded vegetation', name: 'Flooded vegetation', color: '#7A87C6' },
  { class_id: 4, key: 'crops', class_name: 'Crops', name: 'Crops', color: '#E49635' },
  { class_id: 5, key: 'shrub_and_scrub', class_name: 'Shrub & scrub', name: 'Shrub & scrub', color: '#DFC35A' },
  { class_id: 6, key: 'built', class_name: 'Built area', name: 'Built area', color: '#C4281B' },
  { class_id: 7, key: 'bare', class_name: 'Bare ground', name: 'Bare ground', color: '#A59B8F' },
  { class_id: 8, key: 'snow_and_ice', class_name: 'Snow & ice', name: 'Snow & ice', color: '#B39FE1' },
];

function getSomborBoundary() {
  const assetId = process.env.GEE_SOMBOR_ASSET_ID;

  if (!assetId) {
    throw new Error('Missing GEE_SOMBOR_ASSET_ID environment variable.');
  }

  return ee.FeatureCollection(assetId);
}

function getSomborRegion() {
  return getSomborBoundary().geometry();
}

function getDynamicWorldImage(year) {
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  const region = getSomborRegion();

  return ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
    .filterDate(start, end)
    .filterBounds(region)
    .select('label')
    .mode()
    .rename('label')
    .clip(region);
}

let initialized = false;
let initializePromise = null;

function createPrivateKeyConfig() {
  return {
    type: 'service_account',
    project_id: process.env.GEE_PROJECT_ID,
    private_key_id: process.env.GEE_PRIVATE_KEY_ID,
    private_key: process.env.GEE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.GEE_CLIENT_EMAIL,
    client_id: process.env.GEE_CLIENT_ID,
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: process.env.GEE_CLIENT_X509_CERT_URL,
  };
}

function validateConfig(config) {
  const requiredKeys = [
    'project_id',
    'private_key_id',
    'private_key',
    'client_email',
    'client_id',
    'client_x509_cert_url',
  ];

  for (const key of requiredKeys) {
    if (!config[key]) {
      throw new Error(`Missing Earth Engine credential: ${key}`);
    }
  }
}

function initializeEarthEngine() {
  if (initialized) {
    return Promise.resolve();
  }

  if (initializePromise) {
    return initializePromise;
  }

  const privateKeyConfig = createPrivateKeyConfig();
  validateConfig(privateKeyConfig);

  initializePromise = new Promise((resolve, reject) => {
    ee.data.authenticateViaPrivateKey(
      privateKeyConfig,
      () => {
        ee.initialize(
          null,
          null,
          () => {
            initialized = true;
            resolve();
          },
          (error) => {
            initializePromise = null;
            reject(error);
          }
        );
      },
      (error) => {
        initializePromise = null;
        reject(error);
      }
    );
  });

  return initializePromise;
}

function evaluateEeObject(object) {
  return new Promise((resolve, reject) => {
    object.evaluate((result, error) => {
      if (error) reject(error);
      else resolve(result);
    });
  });
}

async function getDynamicWorldStatistics(year) {
  await initializeEarthEngine();

  const image = getDynamicWorldImage(year);
  const region = getSomborRegion();

  const areaImage = ee.Image.pixelArea()
    .divide(10000)
    .rename('area_ha')
    .addBands(image.rename('class'));

  const grouped = areaImage.reduceRegion({
    reducer: ee.Reducer.sum().group({
      groupField: 1,
      groupName: 'class_id',
    }),
    geometry: region,
    scale: 10,
    maxPixels: 1e13,
    tileScale: 4,
  });

  const result = await evaluateEeObject(grouped);
  const groups = result.groups || [];

  return DW_CLASSES.map((cls) => {
    const match = groups.find((item) => Number(item.class_id) === cls.class_id);
    return {
      ...cls,
      area_ha: match ? Number(match.sum.toFixed(2)) : 0,
    };
  });
}

async function getDynamicWorldChange(fromYear, toYear) {
  await initializeEarthEngine();

  const fromStats = await getDynamicWorldStatistics(fromYear);
  const toStats = await getDynamicWorldStatistics(toYear);

  const net_change = DW_CLASSES.map((cls) => {
    const fromItem = fromStats.find((item) => item.class_id === cls.class_id);
    const toItem = toStats.find((item) => item.class_id === cls.class_id);

    const from_ha = fromItem?.area_ha || 0;
    const to_ha = toItem?.area_ha || 0;
    const delta_ha = Number((to_ha - from_ha).toFixed(2));

    return {
      ...cls,
      from_ha,
      to_ha,
      delta_ha,
    };
  });

  const built = net_change.find((item) => item.key === 'built');
  const crops = net_change.find((item) => item.key === 'crops');

  return {
    net_change,
    built_expansion_ha: built ? Math.max(0, built.delta_ha) : 0,
    crop_loss_ha: crops ? Math.max(0, -crops.delta_ha) : 0,
    built_expansion_layer: null,
    crop_loss_layer: null,
  };
}

async function getPointSeries(lat, lng) {
  await initializeEarthEngine();

  const point = ee.Geometry.Point([lng, lat]);
  const years = Array.from({ length: 10 }, (_, index) => 2016 + index);

  const features = years.map((year) => {
    const start = `${year}-01-01`;
    const end = `${year}-12-31`;

    const image = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
      .filterDate(start, end)
      .filterBounds(point)
      .select(DW_PROBABILITY_BANDS)
      .mean();

    const values = image.reduceRegion({
      reducer: ee.Reducer.first(),
      geometry: point,
      scale: 10,
      maxPixels: 1e13,
      tileScale: 4,
    });

    return ee.Feature(null, values).set('year', year);
  });

  const fc = ee.FeatureCollection(features);
  const result = await evaluateEeObject(fc);

  const probabilities = {};
  DW_PROBABILITY_BANDS.forEach((band) => {
    probabilities[band] = [];
  });

  result.features.forEach((feature) => {
    const props = feature.properties || {};

    DW_PROBABILITY_BANDS.forEach((band) => {
      const value = props[band];
      probabilities[band].push(value == null ? 0 : Number(value));
    });
  });

  return {
    lat,
    lng,
    years,
    classes: DW_CLASSES,
    probabilities,
  };
}

  const fc = ee.FeatureCollection(features);
  const result = await evaluateEeObject(fc);

  const probabilities = {};
  DW_CLASSES.forEach((cls) => {
    probabilities[cls.key] = [];
  });

  result.features.forEach((feature) => {
    const props = feature.properties || {};
    DW_CLASSES.forEach((cls) => {
      probabilities[cls.key].push(Number(props[cls.key] || 0));
    });
  });

  return {
    lat,
    lng,
    years,
    classes: DW_CLASSES,
    probabilities,
  };
}

async function getDynamicWorldTileUrl(year) {
  await initializeEarthEngine();

  const image = getDynamicWorldImage(year);

  const visParams = {
    min: 0,
    max: 8,
    palette: [
      '419BDF',
      '397D49',
      '88B053',
      '7A87C6',
      'E49635',
      'DFC35A',
      'C4281B',
      'A59B8F',
      'B39FE1',
    ],
  };

  const map = image.getMapId(visParams);

  return {
    url: map.urlFormat,
    attribution: 'Google Earth Engine / Dynamic World',
  };
}

async function getWorldCoverTileUrl() {
  await initializeEarthEngine();

  const region = getSomborRegion();

  const image = ee.ImageCollection('ESA/WorldCover/v200')
    .first()
    .select('Map')
    .clip(region);

  const visParams = {
    min: 10,
    max: 100,
    palette: [
      '006400',
      'ffbb22',
      'ffff4c',
      'f096ff',
      'fa0000',
      'b4b4b4',
      'f0f0f0',
      '0064c8',
      '0096a0',
      '00cf75',
      'fae6a0',
    ],
  };

  const map = image.getMapId(visParams);

  return {
    url: map.urlFormat,
    attribution: 'Google Earth Engine / ESA WorldCover',
  };
}

async function getBuiltExpansionTileUrl(fromYear, toYear) {
  await initializeEarthEngine();

  const fromImage = getDynamicWorldImage(fromYear);
  const toImage = getDynamicWorldImage(toYear);

  // Dynamic World class 6 = built area
  const builtExpansion = toImage
    .eq(6)
    .and(fromImage.neq(6))
    .selfMask()
    .rename('built_expansion');

  const visParams = {
    min: 1,
    max: 1,
    palette: ['ff00ff'], // magenta
  };

  const map = builtExpansion.getMapId(visParams);

  return {
    url: map.urlFormat,
    attribution: 'Google Earth Engine / Dynamic World built-area expansion',
  };
}

async function getCropLossTileUrl(fromYear, toYear) {
  await initializeEarthEngine();

  const fromImage = getDynamicWorldImage(fromYear);
  const toImage = getDynamicWorldImage(toYear);

  // Dynamic World class 4 = crops
  const cropLoss = fromImage
    .eq(4)
    .and(toImage.neq(4))
    .selfMask()
    .rename('crop_loss');

  const visParams = {
    min: 1,
    max: 1,
    palette: ['111111'], // black
  };

  const map = cropLoss.getMapId(visParams);

  return {
    url: map.urlFormat,
    attribution: 'Google Earth Engine / Dynamic World crop loss',
  };
}

module.exports = {
  getDynamicWorldTileUrl,
  getWorldCoverTileUrl,
  getDynamicWorldStatistics,
  getDynamicWorldChange,
  getPointSeries,
  getBuiltExpansionTileUrl,
  getCropLossTileUrl,
};
