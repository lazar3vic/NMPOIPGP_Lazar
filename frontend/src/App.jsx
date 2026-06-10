import { useEffect, useMemo, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  LayersControl,
  useMapEvents,
} from 'react-leaflet';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import 'leaflet/dist/leaflet.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

function MapClickHandler({ onClick }) {
  useMapEvents({
    click(event) {
      onClick(event.latlng);
    },
  });
  return null;
}

function ClassificationMap({
  title,
  center,
  year,
  layer,
  worldcover,
  showWorldCover,
  builtLayer,
  cropLayer,
  showBuilt,
  showCrop,
  onPointSelect,
}) {
  const styleByClass = (feature) => ({
    color: '#ffffff',
    weight: 1,
    fillOpacity: 0.7,
    fillColor: feature?.properties?.color || '#cccccc',
  });

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
      <h3 className="mb-2 text-sm font-semibold text-slate-700">{title} ({year})</h3>
      <MapContainer center={center} zoom={11} className="h-[420px] w-full rounded-md" scrollWheelZoom>
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="OpenStreetMap">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles &copy; Esri"
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        {layer && <GeoJSON data={layer} style={styleByClass} />}
        {showWorldCover && worldcover && <GeoJSON data={worldcover} style={() => ({ color: '#222', weight: 1, fillOpacity: 0.15 })} />}
        {showBuilt && builtLayer && <GeoJSON data={builtLayer} style={() => ({ color: '#ff00ff', weight: 2, fillOpacity: 0.4 })} />}
        {showCrop && cropLayer && <GeoJSON data={cropLayer} style={() => ({ color: '#111', weight: 2, fillOpacity: 0.4 })} />}
        <MapClickHandler onClick={onPointSelect} />
      </MapContainer>
    </div>
  );
}

async function getJson(path) {
  const response = await fetch(`${apiBase}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed: ${path}`);
  }
  return response.json();
}

export default function App() {
  const [config, setConfig] = useState(null);
  const [years, setYears] = useState([]);
  const [yearA, setYearA] = useState(2016);
  const [yearB, setYearB] = useState(2025);
  const [layerA, setLayerA] = useState(null);
  const [layerB, setLayerB] = useState(null);
  const [worldcover, setWorldcover] = useState(null);
  const [statsA, setStatsA] = useState([]);
  const [statsB, setStatsB] = useState([]);
  const [change, setChange] = useState(null);
  const [showWorldCover, setShowWorldCover] = useState(false);
  const [showBuilt, setShowBuilt] = useState(false);
  const [showCrop, setShowCrop] = useState(false);
  const [pointSeries, setPointSeries] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function bootstrap() {
      try {
        const [cfg, yearsResponse, wc] = await Promise.all([
          getJson('/config'),
          getJson('/years'),
          getJson('/layers/worldcover'),
        ]);
        setConfig(cfg);
        setYears(yearsResponse);
        setWorldcover(wc);
      } catch (err) {
        setError(err.message);
      }
    }

    bootstrap();
  }, []);

  useEffect(() => {
    async function loadComparison() {
      if (!years.length) return;
      setLoading(true);
      setError('');
      try {
        const [dwA, dwB, sA, sB, ch] = await Promise.all([
          getJson(`/layers/dynamic-world?year=${yearA}`),
          getJson(`/layers/dynamic-world?year=${yearB}`),
          getJson(`/statistics?year=${yearA}`),
          getJson(`/statistics?year=${yearB}`),
          getJson(`/change?from=${yearA}&to=${yearB}`),
        ]);
        setLayerA(dwA);
        setLayerB(dwB);
        setStatsA(sA);
        setStatsB(sB);
        setChange(ch);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadComparison();
  }, [years, yearA, yearB]);

  const center = useMemo(() => [config?.center?.lat || 45.7715, config?.center?.lon || 19.107], [config]);

  const handlePointClick = async ({ lat, lng }) => {
    try {
      const data = await getJson(`/point?lat=${lat}&lng=${lng}`);
      setPointSeries(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const areaChartData = {
    labels: statsB.map((item) => item.class_name),
    datasets: [
      {
        label: `${yearA} (ha)`,
        data: statsA.map((item) => item.area_ha),
        backgroundColor: 'rgba(100, 116, 139, 0.6)',
      },
      {
        label: `${yearB} (ha)`,
        data: statsB.map((item) => item.area_ha),
        backgroundColor: 'rgba(14, 116, 144, 0.7)',
      },
    ],
  };

  const changeChartData = {
    labels: (change?.net_change || []).map((item) => item.class_name),
    datasets: [
      {
        label: `Net change ${yearA}→${yearB} (ha)`,
        data: (change?.net_change || []).map((item) => item.delta_ha),
        backgroundColor: (change?.net_change || []).map((item) => item.delta_ha >= 0 ? '#16a34a' : '#dc2626'),
      },
    ],
  };

  const probabilityChartData = pointSeries ? {
    labels: pointSeries.years,
    datasets: pointSeries.classes.map((cls) => ({
      label: cls.name,
      data: pointSeries.probabilities[cls.key],
      borderColor: cls.color,
      backgroundColor: cls.color,
      tension: 0.25,
    })),
  } : null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900">
      <header className="mb-4 rounded-lg bg-white p-4 shadow-sm">
        <h1 className="text-xl font-bold">Land Use Monitoring — Sombor, Serbia</h1>
        <p className="text-sm text-slate-600">Standalone Dynamic World-style monitoring for 2016-2025 (19.107°E, 45.7715°N).</p>
      </header>

      <section className="mb-4 rounded-lg bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-sm font-medium">Year A
            <select className="mt-1 w-full rounded border p-2" value={yearA} onChange={(e) => setYearA(Number(e.target.value))}>
              {years.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium">Year B
            <select className="mt-1 w-full rounded border p-2" value={yearB} onChange={(e) => setYearB(Number(e.target.value))}>
              {years.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          <label className="mt-7 flex items-center gap-2 text-sm"><input type="checkbox" checked={showWorldCover} onChange={(e) => setShowWorldCover(e.target.checked)} /> ESA WorldCover</label>
          <div className="mt-2 flex flex-col gap-1 text-sm md:mt-0 md:justify-end">
            <label className="flex items-center gap-2"><input type="checkbox" checked={showBuilt} onChange={(e) => setShowBuilt(e.target.checked)} /> Built-area expansion</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={showCrop} onChange={(e) => setShowCrop(e.target.checked)} /> Agricultural land loss</label>
          </div>
        </div>
        {error && <p className="mt-3 rounded bg-red-100 p-2 text-sm text-red-700">{error}</p>}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <ClassificationMap
          title="Comparison Map A"
          center={center}
          year={yearA}
          layer={layerA}
          worldcover={worldcover}
          showWorldCover={showWorldCover}
          builtLayer={change?.built_expansion_layer}
          cropLayer={change?.crop_loss_layer}
          showBuilt={showBuilt}
          showCrop={showCrop}
          onPointSelect={handlePointClick}
        />
        <ClassificationMap
          title="Comparison Map B"
          center={center}
          year={yearB}
          layer={layerB}
          worldcover={worldcover}
          showWorldCover={showWorldCover}
          builtLayer={change?.built_expansion_layer}
          cropLayer={change?.crop_loss_layer}
          showBuilt={showBuilt}
          showCrop={showCrop}
          onPointSelect={handlePointClick}
        />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-base font-semibold">Area per class (hectares)</h2>
          {!loading && <Bar data={areaChartData} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />}
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead>
                <tr className="border-b text-slate-500">
                  <th className="p-1">Class</th>
                  <th className="p-1">{yearA}</th>
                  <th className="p-1">{yearB}</th>
                  <th className="p-1">Δ</th>
                </tr>
              </thead>
              <tbody>
                {(change?.net_change || []).map((row) => (
                  <tr key={row.class_id} className="border-b">
                    <td className="p-1">{row.class_name}</td>
                    <td className="p-1">{row.from_ha.toFixed(2)}</td>
                    <td className="p-1">{row.to_ha.toFixed(2)}</td>
                    <td className={`p-1 ${row.delta_ha >= 0 ? 'text-green-700' : 'text-red-700'}`}>{row.delta_ha.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-base font-semibold">Change detection summary</h2>
          {!loading && <Bar data={changeChartData} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />}
          <p className="mt-3 text-sm text-slate-700">Built expansion: <strong>{change?.built_expansion_ha ?? 0} ha</strong></p>
          <p className="text-sm text-slate-700">Agricultural land loss: <strong>{change?.crop_loss_ha ?? 0} ha</strong></p>
        </div>
      </section>

      <section className="mt-4 rounded-lg bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-base font-semibold">Point inspector (click map)</h2>
        {!pointSeries && <p className="text-sm text-slate-600">Click any location in either map to inspect class probabilities over time.</p>}
        {pointSeries && (
          <>
            <p className="mb-2 text-sm text-slate-700">Selected point: {pointSeries.lat.toFixed(5)}, {pointSeries.lng.toFixed(5)}</p>
            <Line data={probabilityChartData} options={{ responsive: true, scales: { y: { min: 0, max: 1 } } }} />
          </>
        )}
      </section>
    </div>
  );
}
