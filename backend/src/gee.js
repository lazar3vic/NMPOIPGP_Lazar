const ee = require('@google/earthengine');

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

async function getDynamicWorldTileUrl(year) {
  await initializeEarthEngine();

  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  const somborPoint = ee.Geometry.Point([19.107, 45.7715]);

  const image = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1')
    .filterDate(start, end)
    .filterBounds(somborPoint)
    .select('label')
    .mode();

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

  const image = ee.Image('ESA/WorldCover/v200/2021').select('Map');

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

module.exports = {
  getDynamicWorldTileUrl,
  getWorldCoverTileUrl,
};
