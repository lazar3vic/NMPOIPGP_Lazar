# NMPOIPGP_Lazar

Standalone land-use monitoring web application for **Sombor, Serbia** (19.107°E, 45.7715°N), converted from the original Google Earth Engine app.

## What this version provides

- Interactive dual-map comparison (2016-2025) with zoom/pan
- Dynamic World-style classification layer visualization (9 classes)
- ESA WorldCover reference layer toggle
- Change detection overlays:
  - Built-up expansion
  - Agricultural land loss
- Area statistics in **charts + table** (hectares)
- Net change per class between two years
- Point inspector (click map) with class probability time series

## Tech Stack

- **Frontend:** React + Vite + Tailwind CSS + React Leaflet + Chart.js
- **Backend:** Node.js + Express
- **Data:** Cached/preprocessed sample GeoJSON-style dataset (`backend/src/data.js`)

## Project Structure

```text
NMPOIPGP_Lazar/
├── frontend/                  # React app
│   ├── src/App.jsx
│   ├── src/main.jsx
│   ├── src/index.css
│   ├── .env.example
│   └── package.json
├── backend/                   # Express API
│   ├── src/app.js
│   ├── src/server.js
│   ├── src/data.js
│   ├── test/api.test.js
│   ├── .env.example
│   └── package.json
└── src/app.js                 # Original Google Earth Engine script (legacy reference)
```

## Setup

### 1) Install dependencies

```bash
cd /home/runner/work/NMPOIPGP_Lazar/NMPOIPGP_Lazar/lazar3vic/NMPOIPGP_Lazar/backend
npm install

cd /home/runner/work/NMPOIPGP_Lazar/NMPOIPGP_Lazar/lazar3vic/NMPOIPGP_Lazar/frontend
npm install
```

### 2) Configure environment

Backend:

```bash
cp /home/runner/work/NMPOIPGP_Lazar/NMPOIPGP_Lazar/lazar3vic/NMPOIPGP_Lazar/backend/.env.example \
   /home/runner/work/NMPOIPGP_Lazar/NMPOIPGP_Lazar/lazar3vic/NMPOIPGP_Lazar/backend/.env
```

Frontend:

```bash
cp /home/runner/work/NMPOIPGP_Lazar/NMPOIPGP_Lazar/lazar3vic/NMPOIPGP_Lazar/frontend/.env.example \
   /home/runner/work/NMPOIPGP_Lazar/NMPOIPGP_Lazar/lazar3vic/NMPOIPGP_Lazar/frontend/.env
```

### 3) Run backend

```bash
cd /home/runner/work/NMPOIPGP_Lazar/NMPOIPGP_Lazar/lazar3vic/NMPOIPGP_Lazar/backend
npm run dev
```

### 4) Run frontend

```bash
cd /home/runner/work/NMPOIPGP_Lazar/NMPOIPGP_Lazar/lazar3vic/NMPOIPGP_Lazar/frontend
npm run dev
```

Open: `http://localhost:5173`

## API Endpoints

- `GET /api/config` - app center, years, classes
- `GET /api/classes` - 9 land-cover classes
- `GET /api/years` - available years (2016-2025)
- `GET /api/layers/dynamic-world?year=YYYY` - yearly classification layer
- `GET /api/layers/worldcover` - ESA reference layer
- `GET /api/statistics?year=YYYY` - area stats (ha)
- `GET /api/change?from=YYYY&to=YYYY` - net changes + change layers
- `GET /api/point?lat=..&lng=..` - point probability time series

## Data integration notes

The current standalone app uses a cached sample dataset in `backend/src/data.js` to mimic Dynamic World workflows.

To integrate real preprocessed data:
1. Replace `CELLS`/`WORLDCOVER` in `backend/src/data.js` with exported GeoJSON/GeoTIFF-derived vector summaries.
2. Keep class IDs compatible with the 9 Dynamic World classes.
3. Ensure yearly values are available for 2016-2025.
4. Keep area values in hectares (`area_ha`) for consistent statistics.

## Verification

Backend tests:

```bash
cd /home/runner/work/NMPOIPGP_Lazar/NMPOIPGP_Lazar/lazar3vic/NMPOIPGP_Lazar/backend
npm test
```

Frontend lint/build:

```bash
cd /home/runner/work/NMPOIPGP_Lazar/NMPOIPGP_Lazar/lazar3vic/NMPOIPGP_Lazar/frontend
npm run lint
npm run build
```
