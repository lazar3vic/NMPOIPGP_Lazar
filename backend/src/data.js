const SOMBOR_CENTER = [19.107, 45.7715];

const CLASSES = [
  { id: 0, key: 'water', name: 'Water', color: '#419BDF' },
  { id: 1, key: 'trees', name: 'Trees', color: '#397D49' },
  { id: 2, key: 'grass', name: 'Grass', color: '#88B053' },
  { id: 3, key: 'flooded_vegetation', name: 'Flooded vegetation', color: '#7A87C6' },
  { id: 4, key: 'crops', name: 'Crops', color: '#E49635' },
  { id: 5, key: 'shrub_scrub', name: 'Shrub/Scrub', color: '#DFC35A' },
  { id: 6, key: 'built_up', name: 'Built-up', color: '#C4281B' },
  { id: 7, key: 'bare_ground', name: 'Bare ground', color: '#A59B8F' },
  { id: 8, key: 'snow_ice', name: 'Snow/Ice', color: '#B39FE1' },
];

const YEARS = Array.from({ length: 10 }, (_, i) => 2016 + i);

const CELLS = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[[19.02, 45.82], [19.10, 45.82], [19.10, 45.77], [19.02, 45.77], [19.02, 45.82]]] },
      properties: {
        id: 'cell-1', area_ha: 1050,
        classes: { 2016: 4, 2017: 4, 2018: 4, 2019: 4, 2020: 2, 2021: 2, 2022: 2, 2023: 6, 2024: 6, 2025: 6 },
      },
    },
    {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[[19.10, 45.82], [19.19, 45.82], [19.19, 45.77], [19.10, 45.77], [19.10, 45.82]]] },
      properties: {
        id: 'cell-2', area_ha: 1200,
        classes: { 2016: 4, 2017: 4, 2018: 4, 2019: 4, 2020: 4, 2021: 4, 2022: 6, 2023: 6, 2024: 6, 2025: 6 },
      },
    },
    {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[[19.19, 45.82], [19.27, 45.82], [19.27, 45.77], [19.19, 45.77], [19.19, 45.82]]] },
      properties: {
        id: 'cell-3', area_ha: 850,
        classes: { 2016: 1, 2017: 1, 2018: 1, 2019: 1, 2020: 1, 2021: 1, 2022: 1, 2023: 1, 2024: 1, 2025: 1 },
      },
    },
    {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[[19.02, 45.77], [19.10, 45.77], [19.10, 45.72], [19.02, 45.72], [19.02, 45.77]]] },
      properties: {
        id: 'cell-4', area_ha: 940,
        classes: { 2016: 2, 2017: 2, 2018: 2, 2019: 4, 2020: 4, 2021: 4, 2022: 4, 2023: 4, 2024: 2, 2025: 2 },
      },
    },
    {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[[19.10, 45.77], [19.19, 45.77], [19.19, 45.72], [19.10, 45.72], [19.10, 45.77]]] },
      properties: {
        id: 'cell-5', area_ha: 1100,
        classes: { 2016: 6, 2017: 6, 2018: 6, 2019: 6, 2020: 6, 2021: 6, 2022: 6, 2023: 6, 2024: 6, 2025: 6 },
      },
    },
    {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[[19.19, 45.77], [19.27, 45.77], [19.27, 45.72], [19.19, 45.72], [19.19, 45.77]]] },
      properties: {
        id: 'cell-6', area_ha: 760,
        classes: { 2016: 0, 2017: 0, 2018: 3, 2019: 3, 2020: 3, 2021: 3, 2022: 0, 2023: 0, 2024: 0, 2025: 0 },
      },
    },
  ],
};

const WORLDCOVER = {
  type: 'FeatureCollection',
  features: CELLS.features.map((feature) => ({
    type: 'Feature',
    geometry: feature.geometry,
    properties: {
      id: feature.properties.id,
      class_id: feature.properties.classes[2021],
    },
  })),
};

const classById = (id) => CLASSES.find((c) => c.id === id);

function getDynamicWorldLayer(year) {
  const y = Number(year);
  return {
    type: 'FeatureCollection',
    features: CELLS.features.map((feature) => {
      const classId = feature.properties.classes[y];
      const cls = classById(classId);
      return {
        type: 'Feature',
        geometry: feature.geometry,
        properties: {
          id: feature.properties.id,
          class_id: classId,
          class_name: cls.name,
          color: cls.color,
          area_ha: feature.properties.area_ha,
          year: y,
        },
      };
    }),
  };
}

function aggregateStats(year) {
  const y = Number(year);
  const totals = new Map(CLASSES.map((item) => [item.id, 0]));

  CELLS.features.forEach((feature) => {
    const classId = feature.properties.classes[y];
    totals.set(classId, totals.get(classId) + feature.properties.area_ha);
  });

  return CLASSES.map((item) => ({
    class_id: item.id,
    class_name: item.name,
    color: item.color,
    area_ha: Number(totals.get(item.id).toFixed(2)),
    year: y,
  }));
}

function getCentroid(feature) {
  const coords = feature.geometry.coordinates[0];
  let x = 0;
  let y = 0;
  coords.slice(0, -1).forEach(([lon, lat]) => {
    x += lon;
    y += lat;
  });
  const n = coords.length - 1;
  return [x / n, y / n];
}

function getNearestCell(lat, lng) {
  let best = CELLS.features[0];
  let bestDistance = Number.POSITIVE_INFINITY;

  CELLS.features.forEach((feature) => {
    const [cx, cy] = getCentroid(feature);
    const distance = (cx - lng) ** 2 + (cy - lat) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = feature;
    }
  });

  return best;
}

function getPointSeries(lat, lng) {
  const feature = getNearestCell(Number(lat), Number(lng));
  const probabilities = Object.fromEntries(CLASSES.map((item) => [item.key, []]));
  const dominant = [];

  YEARS.forEach((year) => {
    const dominantClass = feature.properties.classes[year];
    dominant.push({ year, class_id: dominantClass, class_name: classById(dominantClass).name });

    const baseline = 0.2 / (CLASSES.length - 1);
    const values = CLASSES.map((cls) => (cls.id === dominantClass ? 0.8 : baseline));

    const seed = Math.abs(Math.sin((year + Number(lat) + Number(lng)) * 1000));
    const idx = Math.floor(seed * CLASSES.length) % CLASSES.length;
    values[idx] = Math.max(0.01, values[idx] - 0.03);
    values[dominantClass] = Math.min(0.95, values[dominantClass] + 0.03);

    const sum = values.reduce((acc, v) => acc + v, 0);
    values.forEach((value, i) => {
      const normalized = Number((value / sum).toFixed(4));
      probabilities[CLASSES[i].key].push(normalized);
    });
  });

  return {
    lat: Number(lat),
    lng: Number(lng),
    years: YEARS,
    classes: CLASSES,
    dominant,
    probabilities,
  };
}

function getChange(fromYear, toYear) {
  const fromStats = aggregateStats(fromYear);
  const toStats = aggregateStats(toYear);

  const fromMap = new Map(fromStats.map((item) => [item.class_id, item.area_ha]));
  const toMap = new Map(toStats.map((item) => [item.class_id, item.area_ha]));

  const netChange = CLASSES.map((item) => ({
    class_id: item.id,
    class_name: item.name,
    color: item.color,
    from_ha: fromMap.get(item.id),
    to_ha: toMap.get(item.id),
    delta_ha: Number((toMap.get(item.id) - fromMap.get(item.id)).toFixed(2)),
  }));

  const builtExpansion = [];
  const cropLoss = [];

  CELLS.features.forEach((feature) => {
    const fromClass = feature.properties.classes[fromYear];
    const toClass = feature.properties.classes[toYear];

    if (toClass === 6 && fromClass !== 6) {
      builtExpansion.push({
        type: 'Feature',
        geometry: feature.geometry,
        properties: { id: feature.properties.id, area_ha: feature.properties.area_ha },
      });
    }

    if (fromClass === 4 && toClass !== 4) {
      cropLoss.push({
        type: 'Feature',
        geometry: feature.geometry,
        properties: { id: feature.properties.id, area_ha: feature.properties.area_ha },
      });
    }
  });

  return {
    from: Number(fromYear),
    to: Number(toYear),
    net_change: netChange,
    built_expansion_ha: Number(builtExpansion.reduce((sum, feature) => sum + feature.properties.area_ha, 0).toFixed(2)),
    crop_loss_ha: Number(cropLoss.reduce((sum, feature) => sum + feature.properties.area_ha, 0).toFixed(2)),
    built_expansion_layer: { type: 'FeatureCollection', features: builtExpansion },
    crop_loss_layer: { type: 'FeatureCollection', features: cropLoss },
  };
}

module.exports = {
  SOMBOR_CENTER,
  CLASSES,
  YEARS,
  WORLDCOVER,
  aggregateStats,
  getDynamicWorldLayer,
  getPointSeries,
  getChange,
};
