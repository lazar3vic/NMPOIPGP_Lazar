// Google Earth Engine App: Land Use Monitoring for Sombor, Serbia
// Purpose:
// - Monitor land-use / land-cover patterns in and around Sombor
// - Compare two years using Dynamic World (10 m, 2015-present)
// - Show per-class area statistics and simple change layers
//
// Then click Apps > New App to publish.

/*********************************
 * 1) REGION OF INTEREST (ROI)
 *********************************/

// ---------- OPTION A: Asset-based Sombor boundary (recommended) ----------
var sombor = ee.FeatureCollection('projects/ee-lazar33t/assets/sombor_boundaries');
var roi = sombor.geometry();
var referencePoint = ee.Geometry.Point([19.107, 45.7715]);

// ---------- OPTION B: Imported asset variable from the Imports panel ----------
// If your asset is already imported in the Earth Engine editor as "sombor",
// comment out Option A above and use only:
// var roi = sombor.geometry();

/*********************************
 * 2) DATASETS
 *********************************/

var dw = ee.ImageCollection('GOOGLE/DYNAMICWORLD/V1');
var worldCover2021 = ee.Image('ESA/WorldCover/v200/2021');

var CLASS_NAMES = ee.List([
  'vodena površina', 'šumski pokrivač', 'travnata površina', 'močvarno zemljište', 'poljoprivredni usevi',
  'žbunasta vegetacija', 'urbana površina', 'ogoljeno zemljište', 'snežni pokrivač'
]);

var CLASS_NAMES_UI = [
  'water', 'trees', 'grass', 'flooded_vegetation', 'crops', 'shrub_and_scrub', 'built', 'bare', 'snow_and_ice'
];

var CLASS_PALETTE = [
  '#419BDF', // water
  '#397D49', // trees
  '#88B053', // grass
  '#7A87C6', // flooded vegetation
  '#E49635', // crops
  '#DFC35A', // shrub and scrub
  '#C4281B', // built
  '#A59B8F', // bare
  '#B39FE1'  // snow and ice
];

var WORLDCOVER_CLASS_VALUES = [10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 100];
var WORLDCOVER_PALETTE = [
  '#006400', '#ffbb22', '#ffff4c', '#f096ff', '#fa0000',
  '#b4b4b4', '#f0f0f0', '#0064c8', '#0096a0', '#00cf75', '#fae6a0'
];

/*********************************
 * 3) HELPERS
 *********************************/

function getDwAnnualComposite(year) {
  year = ee.Number(year);

  var start = ee.Date.fromYMD(year, 4, 1);
  var end = ee.Date.fromYMD(year, 10, 31);

  var col = dw
    .filterBounds(roi)
    .filterDate(start, end);

  var count = col.size();

  var composite = ee.Image(
    ee.Algorithms.If(
      count.gt(0),
      col.select('label').mode().rename('label'),
      ee.Image.constant(0).rename('label').clip(roi)
    )
  ).clip(roi);

  return composite.set('year', year).set('image_count', count);
}

function getDwAreaTable(image, year) {
  var areaImage = ee.Image.pixelArea().divide(10000).addBands(image.rename('label'));

  var groups = ee.Dictionary(
    areaImage.reduceRegion({
      reducer: ee.Reducer.sum().group({
        groupField: 1,
        groupName: 'class'
      }),
      geometry: roi,
      scale: 10,
      maxPixels: 1e10,
      tileScale: 4
    })
  );

  var groupList = ee.List(groups.get('groups', ee.List([])));

  var fc = ee.FeatureCollection(groupList.map(function(item) {
    item = ee.Dictionary(item);
    var classId = ee.Number(item.get('class')).toInt();
    var areaHa = ee.Number(item.get('sum'));

    return ee.Feature(null, {
      year: year,
      class_id: classId,
      class_name: ee.String(CLASS_NAMES.get(classId)),
      area_ha: areaHa
    });
  }));

  var full = ee.FeatureCollection(ee.List.sequence(0, 8).map(function(i) {
    i = ee.Number(i).toInt();
    var match = fc.filter(ee.Filter.eq('class_id', i)).first();

    return ee.Feature(ee.Algorithms.If(
      match,
      match,
      ee.Feature(null, {
        year: year,
        class_id: i,
        class_name: ee.String(CLASS_NAMES.get(i)),
        area_ha: 0
      })
    ));
  }));

  return full.sort('class_id');
}

function makeAreaChart(fc, title) {
  return ui.Chart.feature.byFeature(fc, 'class_name', 'area_ha')
    .setChartType('ColumnChart')
    .setOptions({
      title: title,
      legend: {position: 'none'},
      hAxis: {title: 'Klasa', slantedText: true, slantedTextAngle: 45},
      vAxis: {title: 'Površina (ha)'},
      chartArea: {left: 70, right: 20, top: 50, bottom: 110}
    });
}

function makeChangeChart(fc1, fc2, year1, year2) {
  var joined = ee.FeatureCollection(ee.List.sequence(0, 8).map(function(i) {
    i = ee.Number(i).toInt();

    var f1 = ee.Feature(fc1.filter(ee.Filter.eq('class_id', i)).first());
    var f2 = ee.Feature(fc2.filter(ee.Filter.eq('class_id', i)).first());

    var a1 = ee.Number(f1.get('area_ha'));
    var a2 = ee.Number(f2.get('area_ha'));

    return ee.Feature(null, {
      class_id: i,
      class_name: ee.String(CLASS_NAMES.get(i)),
      area_ha_y1: a1,
      area_ha_y2: a2,
      delta_ha: a2.subtract(a1)
    });
  }));

  return ui.Chart.feature.byFeature(joined, 'class_name', ['area_ha_y1', 'area_ha_y2'])
    .setChartType('ColumnChart')
    .setOptions({
      title: 'Površina po klasi: ' + year1 + ' v ' + year2,
      hAxis: {title: 'Klasa', slantedText: true, slantedTextAngle: 45},
      vAxis: {title: 'Površina (ha)'},
      series: {
        0: {labelInLegend: String(year1)},
        1: {labelInLegend: String(year2)}
      },
      chartArea: {left: 70, right: 20, top: 50, bottom: 110}
    });
}

function makeDeltaChart(fc1, fc2, year1, year2) {
  var joined = ee.FeatureCollection(ee.List.sequence(0, 8).map(function(i) {
    i = ee.Number(i).toInt();

    var f1 = ee.Feature(fc1.filter(ee.Filter.eq('class_id', i)).first());
    var f2 = ee.Feature(fc2.filter(ee.Filter.eq('class_id', i)).first());

    var a1 = ee.Number(f1.get('area_ha'));
    var a2 = ee.Number(f2.get('area_ha'));

    return ee.Feature(null, {
      class_name: ee.String(CLASS_NAMES.get(i)),
      delta_ha: a2.subtract(a1)
    });
  }));

  return ui.Chart.feature.byFeature(joined, 'class_name', 'delta_ha')
    .setChartType('ColumnChart')
    .setOptions({
      title: 'Neto promena površine (ha): ' + year1 + ' → ' + year2,
      legend: {position: 'none'},
      hAxis: {title: 'Klasa', slantedText: true, slantedTextAngle: 45},
      vAxis: {title: 'Promena površine (ha)'},
      chartArea: {left: 70, right: 20, top: 50, bottom: 110}
    });
}

function styledLabel(text, style) {
  return ui.Label(text, style || {});
}

function getLatestDwClassification() {
  var col = dw
    .filterBounds(referencePoint)
    .sort('system:time_start', false);

  var count = col.size();

  var latest = ee.Image(
    ee.Algorithms.If(
      count.gt(0),
      ee.Image(col.first()).select('label'),
      ee.Image.constant(0)
        .rename('label')
        .updateMask(ee.Image.constant(0))
    )
  );

  return latest
    .clip(roi)
    .set('image_count', count)
    .set(
      'date',
      ee.Algorithms.If(
        count.gt(0),
        ee.Date(ee.Image(col.first()).get('system:time_start')).format('YYYY-MM-dd'),
        'no image'
      )
    );
}

/*********************************
 * 4) UI
 *********************************/

var map = ui.Map();
map.centerObject(roi, 11);
map.style().set('cursor', 'crosshair');

var title = styledLabel('Praćenje promena načina korišćenja zemljišta — Sombor, Srbija', {
  fontWeight: 'bold',
  fontSize: '20px',
  margin: '0 0 8px 0'
});

var subtitle = styledLabel(
  'Poredite godišnje kompozite zemljišnog pokrivača iz izvora Dynamic World i istražite prostor po klasama.',
  {margin: '0 0 12px 0', color: '#444'}
);

var yearList = [];
for (var y = 2016; y <= 2025; y++) {
  yearList.push(String(y));
}

var year1Select = ui.Select({
  items: yearList,
  value: '2016',
  placeholder: 'Start year'
});

var year2Select = ui.Select({
  items: yearList,
  value: '2025',
  placeholder: 'End year'
});

var builtOnlyCheckbox = ui.Checkbox({
  label: 'Prikaži proširenja izgrađenog zemljišta (Show built expansion only)',
  value: false
});

var cropsLossCheckbox = ui.Checkbox({
  label: 'Prikaži gubitak poljoprivdrednih useva (Show crop loss only)',
  value: false
});

var showWorldCoverCheckbox = ui.Checkbox({
  label: 'Prikaži referentni sloj ESA WorldCover 2021',
  value: false
});

var showLatestDwCheckbox = ui.Checkbox({
  label: 'Prikaži poslednju dostupnu Dynamic World klasifikaciju na osnovu referentne tačke',
  value: false
});

var infoBox = ui.Label('Pritisnite "Osveži" da biste osvežili karte i grafikone.', {
  whiteSpace: 'pre-wrap',
  color: '#333',
  margin: '8px 0 8px 0'
});

var chartPanel = ui.Panel({
  style: {
    stretch: 'both',
    margin: '10px 0 0 0'
  }
});

var CLASS_NAMES_SR_UI = [
  'vodena površina',
  'šumski pokrivač',
  'travnata površina',
  'močvarno zemljište',
  'poljoprivredni usevi',
  'žbunasta vegetacija',
  'urbana površina',
  'ogoljeno zemljište',
  'snežni pokrivač'
];

var legendPanel = ui.Panel({
  style: {
    padding: '8px 0 8px 0',
    backgroundColor: 'rgba(255,255,255,0)'
  }
});

legendPanel.add(ui.Label('Legenda — Dynamic World klase', {
  fontWeight: 'bold',
  margin: '8px 0 6px 0'
}));

for (var i = 0; i < CLASS_NAMES_UI.length; i++) {
  legendPanel.add(
    ui.Panel([
      ui.Label('', {
        backgroundColor: CLASS_PALETTE[i],
        padding: '8px',
        margin: '0 8px 4px 0'
      }),
      ui.Label(CLASS_NAMES_SR_UI[i], {
        margin: '0 0 4px 0'
      })
    ], ui.Panel.Layout.Flow('horizontal'))
  );
}

var updateButton = ui.Button({
  label: 'Osveži',
  style: {stretch: 'horizontal', fontWeight: 'bold'}
});

var inspectorTitle = ui.Label('Point inspector', {
  fontWeight: 'bold',
  margin: '12px 0 6px 0'
});

var inspectorText = ui.Label('Kliknite na mapu da biste proverili verovatnoće klasa.', {
  whiteSpace: 'pre-wrap',
  color: '#444'
});

var inspectorChartPanel = ui.Panel();

var leftPanel = ui.Panel({
  widgets: [
    title,
    subtitle,
    ui.Label('Godine poređenja', {fontWeight: 'bold'}),
    ui.Panel([
      ui.Label('Godina 1', {width: '60px'}),
      year1Select
    ], ui.Panel.Layout.Flow('horizontal')),
    ui.Panel([
      ui.Label('Godina 2', {width: '60px'}),
      year2Select
    ], ui.Panel.Layout.Flow('horizontal')),
    builtOnlyCheckbox,
    cropsLossCheckbox,
    showWorldCoverCheckbox,
    showLatestDwCheckbox,
    updateButton,
    legendPanel,
    infoBox,
    chartPanel,
    inspectorTitle,
    inspectorText,
    inspectorChartPanel
  ],
  style: {
    width: '410px',
    padding: '12px'
  }
});

ui.root.clear();
ui.root.add(leftPanel);
ui.root.add(map);

/*********************************
 * 5) MAP UPDATE LOGIC
 *********************************/

function updateApp() {
  chartPanel.clear();
  inspectorChartPanel.clear();
  map.layers().reset();

  // Reset selected point when updating.
  selectedPointLayer = null;
  inspectorText.setValue('Kliknite na mapu da biste proverili verovatnoće klasa.');

  var year1 = parseInt(year1Select.getValue(), 10);
  var year2 = parseInt(year2Select.getValue(), 10);

  if (year2 < year1) {
    infoBox.setValue('Godina 2 mora biti veća ili jednaka godini 1.');
    return;
  }

  var img1 = getDwAnnualComposite(year1);
  var img2 = getDwAnnualComposite(year2);

  var fc1 = getDwAreaTable(img1, year1);
  var fc2 = getDwAreaTable(img2, year2);

  var vis = {
    min: 0,
    max: 8,
    palette: CLASS_PALETTE
  };

  map.centerObject(roi, 11);
  map.addLayer(
    sombor.style({color: 'black', fillColor: '00000000', width: 2}),
    {},
    'Sombor boundary',
    true,
    1
  );
  map.addLayer(
  referencePoint,
  {color: '#ffff00'},
  'Referentna tačka za poslednju Dynamic World klasifikaciju',
  true,
  1
);
  map.addLayer(img1, vis, 'Dynamic World ' + year1, true, 0.85);
  map.addLayer(img2, vis, 'Dynamic World ' + year2, false, 0.85);

  if (showWorldCoverCheckbox.getValue()) {
    map.addLayer(
      worldCover2021
        .remap(WORLDCOVER_CLASS_VALUES, ee.List.sequence(0, 10))
        .clip(roi),
      {min: 0, max: 10, palette: WORLDCOVER_PALETTE},
      'ESA WorldCover 2021',
      false,
      0.8
    );
  }
  
  if (showLatestDwCheckbox.getValue()) {
  var latestDw = getLatestDwClassification();

  map.addLayer(
    latestDw,
    {
      min: 0,
      max: 8,
      palette: CLASS_PALETTE
    },
    'Poslednja dostupna Dynamic World klasifikacija',
    true,
    0.85
  );
}

  var builtExpansion = img2.eq(6).and(img1.neq(6)).selfMask();
  var cropLoss = img1.eq(4).and(img2.neq(4)).selfMask();

  if (builtOnlyCheckbox.getValue()) {
    map.addLayer(
      builtExpansion,
      {palette: ['#ff00ff']},
      'Built expansion ' + year1 + '→' + year2,
      true,
      0.95
    );
  }

  if (cropsLossCheckbox.getValue()) {
    map.addLayer(
      cropLoss,
      {palette: ['#000000']},
      'Crop loss ' + year1 + '→' + year2,
      true,
      0.95
    );
  }

  chartPanel.add(makeAreaChart(fc1, 'Area by class — ' + year1));
  chartPanel.add(makeAreaChart(fc2, 'Area by class — ' + year2));
  chartPanel.add(makeChangeChart(fc1, fc2, year1, year2));
  chartPanel.add(makeDeltaChart(fc1, fc2, year1, year2));

  var countsText = ee.String('Images used (Apr-Oct): ')
    .cat(ee.Number(img1.get('image_count')).format())
    .cat(' for ' + year1 + ', ')
    .cat(ee.Number(img2.get('image_count')).format())
    .cat(' for ' + year2 + '.');

  countsText.evaluate(function(t) {
    var osnovniTekst =
    'Prostor monitoringa: Grad Sombor, Srbija\n' +
    'Kompoziti: modalne Dynamic World klase u periodu April-Oktobar za svaku godinu.\n' +
    t + '\n' +
    'Savet: Uključiti sloj prikaza promene izgrađenosti za naglašavanje urbanog razvoja i širenja infrastrukture.\n' +
    '\nReferentna tačka za poslednju Dynamic World klasifikaciju:\n' +
    'Lon: 19.107, Lat: 45.7715';

  if (showLatestDwCheckbox.getValue()) {
    var latestDw = getLatestDwClassification();

    latestDw.get('date').evaluate(function(date) {
      latestDw.get('image_count').evaluate(function(n) {
        if (n === 0) {
          infoBox.setValue(
            osnovniTekst + '\n\n' +
            'Nema pronađenih Dynamic World snimaka koji sadrže referentnu tačku.'
          );
        } else {
          infoBox.setValue(
            osnovniTekst + '\n\n' +
            'Poslednja dostupna Dynamic World klasifikacija je uzeta iz snimka koji sadrži referentnu tačku.\n' +
            'Datum snimka: ' + date + '\n' +
            'Broj dostupnih snimaka za tu tačku: ' + n
          );
        }
      });
    });
  } else {
    infoBox.setValue(osnovniTekst);
  }
});
}

updateButton.onClick(updateApp);
updateApp();

/*********************************
 * 6) POINT INSPECTOR
 *********************************/

// Holds the currently displayed clicked point layer.
var selectedPointLayer = null;

map.onClick(function(coords) {
  inspectorChartPanel.clear();

  var pt = ee.Geometry.Point([coords.lon, coords.lat]);

  var yearlySeries = dw
    .filterBounds(pt)
    .filterDate('2016-01-01', '2025-12-31')
    .select(CLASS_NAMES_UI);

  var chart = ui.Chart.image.series({
    imageCollection: yearlySeries,
    region: pt,
    reducer: ee.Reducer.first(),
    scale: 10
  }).setOptions({
    title: 'Verovatnoća klase na odabranoj lokaciji',
    lineWidth: 2,
    pointSize: 2,
    hAxis: {title: 'Datum'},
    vAxis: {title: 'Verovatnoća', viewWindow: {min: 0, max: 1}}
  });

  inspectorText.setValue(
    'Lon: ' + coords.lon.toFixed(5) + '\n' +
    'Lat: ' + coords.lat.toFixed(5)
  );

  inspectorChartPanel.add(chart);

  if (selectedPointLayer !== null) {
    map.layers().remove(selectedPointLayer);
  }

  selectedPointLayer = ui.Map.Layer(
    pt,
    {color: '#ffff00'},
    'Selected point',
    true,
    1
  );

  map.layers().add(selectedPointLayer);
});

/*********************************
 * 7) OPTIONAL EXPORT SNIPPETS
 *********************************/

// Example export of the later-year composite:
// Export.image.toDrive({
//   image: getDwAnnualComposite(2025),
//   description: 'Sombor_DW_2025',
//   folder: 'EarthEngine',
//   region: roi,
//   scale: 10,
//   maxPixels: 1e13
// });

// Example export of area stats as a CSV:
// Export.table.toDrive({
//   collection: getDwAreaTable(getDwAnnualComposite(2025), 2025),
//   description: 'Sombor_DW_Area_2025',
//   folder: 'EarthEngine',
//   fileFormat: 'CSV'
// });
