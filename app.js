const SUPABASE_URL = '@@SUPABASE_URL@@';
const SUPABASE_KEY = '@@SUPABASE_KEY@@';

const LAYERS = [
  {
    id: 'areas_verdes_geom',
    name: 'Areas Verdes',
    desc: 'Parques y zonas verdes de Cuenca',
    icon: 'fa-tree',
    color: '#10b981',
    geomType: 'polygon',
    displayFields: ['name', 'tipo', 'direccion', 'area_ha', 'codigo'],
    labelField: 'name',
    maxFeatures: 2000
  },
  {
    id: 'ave_ucuenca',
    name: 'Aves',
    desc: 'Observaciones de aves (iNaturalist)',
    icon: 'fa-dove',
    color: '#3b82f6',
    geomType: 'point',
    displayFields: ['common_nam', 'taxon_orde', 'taxon_fami', 'taxon_spec', 'time_obser', 'place_gues'],
    imageField: 'image_url',
    linkField: 'url',
    labelField: 'common_nam',
    maxFeatures: 5000
  },
  {
    id: 'emplazamiento_ucuenca',
    name: 'Emplazamientos',
    desc: 'Edificios e infraestructura UCuenca',
    icon: 'fa-building',
    color: '#f59e0b',
    geomType: 'polygon',
    displayFields: ['name', 'building', 'amenity', 'faculty', 'ec_tipo', 'height', 'building_l', 'opening_ho'],
    labelField: 'name',
    maxFeatures: 2000
  },
  {
    id: 'flora_ucuenca',
    name: 'Flora',
    desc: 'Observaciones de flora (iNaturalist)',
    icon: 'fa-seedling',
    color: '#a855f7',
    geomType: 'point',
    displayFields: ['common_nam', 'taxon_orde', 'taxon_fami', 'taxon_spec', 'time_obser', 'place_gues'],
    imageField: 'image_url',
    linkField: 'url',
    labelField: 'common_nam',
    maxFeatures: 5000
  },
  {
    id: 'rios_cuenca',
    name: 'Rios',
    desc: 'Rios y quebradas de Cuenca',
    icon: 'fa-water',
    color: '#06b6d4',
    geomType: 'line',
    displayFields: ['name', 'waterway', 'intermitte', 'width', 'source', 'wikidata'],
    labelField: 'name',
    maxFeatures: 2000
  }
];

const map = L.map('map', {
  center: [-2.9000, -79.0050],
  zoom: 13,
  zoomControl: false,
  attributionControl: true
});

L.control.zoom({ position: 'topright' }).addTo(map);

L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
  subdomains: 'abcd',
  maxZoom: 19
}).addTo(map);

const activeLayers = {};
const layerCounts = {};

function showLoading(text) {
  document.getElementById('loading-overlay').style.display = 'block';
  document.getElementById('loading-text').textContent = text || 'Cargando...';
}
function hideLoading() {
  document.getElementById('loading-overlay').style.display = 'none';
}

function parseCoordString(str) {
  if (typeof str !== 'string') return str;
  const parts = str.trim().split(/\s+/).map(Number);
  return parts.filter(v => !isNaN(v)).slice(0, 3);
}

function fixPolygonCoords(coords) {
  if (!Array.isArray(coords)) return coords;
  if (coords.length === 0) return coords;
  if (typeof coords[0] === 'string') return coords.map(parseCoordString);
  if (Array.isArray(coords[0])) return coords.map(fixPolygonCoords);
  return coords;
}

function fixGeometry(geom) {
  if (!geom) return null;
  if (geom.type === 'MultiPolygon' || geom.type === 'Polygon') {
    return { type: geom.type, coordinates: fixPolygonCoords(geom.coordinates) };
  }
  return geom;
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function buildPopup(props, layerCfg) {
  const color = layerCfg.color;
  const icon = layerCfg.icon;
  const title = props[layerCfg.labelField] || `#${props.gid || ''}`;

  let html = `<div class="popup-content">`;
  html += `<div class="popup-header">`;
  html += `<div class="popup-badge" style="background:${color}22;color:${color}"><i class="fas ${icon}"></i></div>`;
  html += `<div class="popup-title">${escapeHtml(title)}</div>`;
  html += `</div>`;

  if (layerCfg.imageField && props[layerCfg.imageField]) {
    html += `<img class="popup-img" src="${escapeHtml(props[layerCfg.imageField])}" onerror="this.style.display='none'" />`;
  }

  html += `<div class="popup-grid">`;
  for (const field of layerCfg.displayFields) {
    const val = props[field];
    if (val != null && val !== '' && val !== 'null') {
      const cleanKey = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      html += `<span class="popup-key">${escapeHtml(cleanKey)}</span>`;
      html += `<span class="popup-val">${escapeHtml(val)}</span>`;
    }
  }
  html += `</div>`;

  if (layerCfg.linkField && props[layerCfg.linkField]) {
    html += `<a class="popup-link" href="${escapeHtml(props[layerCfg.linkField])}" target="_blank"><i class="fas fa-external-link-alt"></i> Ver mas</a>`;
  }

  html += `</div>`;
  return html;
}

function getLayerStyle(layerCfg) {
  const c = layerCfg.color;
  if (layerCfg.geomType === 'polygon') {
    return { color: c, weight: 2, fillColor: c, fillOpacity: 0.25 };
  }
  if (layerCfg.geomType === 'line') {
    return { color: c, weight: 3, opacity: 0.85 };
  }
  return {};
}

function getPointStyle(layerCfg) {
  const c = layerCfg.color;
  return { radius: 6, fillColor: c, color: '#fff', weight: 1.5, fillOpacity: 0.85 };
}

async function toggleLayer(layerId) {
  const cfg = LAYERS.find(l => l.id === layerId);
  if (!cfg) return;

  if (activeLayers[layerId]) {
    map.removeLayer(activeLayers[layerId]);
    delete activeLayers[layerId];
    updateUI();
    return;
  }

  showLoading(`Cargando ${cfg.name}...`);

  try {
    const fields = ['gid', 'geom', cfg.labelField, cfg.imageField, cfg.linkField, ...cfg.displayFields].filter(v => v != null).filter((v,i,a) => a.indexOf(v) === i).join(',');
    const url = `${SUPABASE_URL}/rest/v1/${layerId}?select=${encodeURIComponent(fields)}&limit=${cfg.maxFeatures}`;

    const res = await fetch(url, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

    const data = await res.json();
    const features = [];

    for (const row of data) {
      let geom = row.geom;
      if (!geom) continue;

      if (typeof geom === 'string') {
        try { geom = JSON.parse(geom); } catch(e) { continue; }
      }

      geom = fixGeometry(geom);
      if (!geom || !geom.type) continue;

      const properties = {};
      for (const [k, v] of Object.entries(row)) {
        if (k !== 'geom') properties[k] = v;
      }
      features.push({ type: 'Feature', geometry: geom, properties });
    }

    if (features.length === 0) {
      hideLoading();
      alert(`Sin datos para ${cfg.name}`);
      return;
    }

    const fc = { type: 'FeatureCollection', features };
    const style = getLayerStyle(cfg);
    const pointStyle = getPointStyle(cfg);

    const layer = L.geoJSON(fc, {
      style: () => style,
      pointToLayer: (feature, latlng) => L.circleMarker(latlng, pointStyle),
      onEachFeature: (feature, leafletLayer) => {
        leafletLayer.bindPopup(buildPopup(feature.properties, cfg), { maxWidth: 340, className: '' });
      }
    }).addTo(map);

    activeLayers[layerId] = layer;
    layerCounts[layerId] = features.length;

    try {
      map.fitBounds(layer.getBounds(), { padding: [50, 50], maxZoom: 16 });
    } catch(e) {}

    hideLoading();
    updateUI();
  } catch(e) {
    hideLoading();
    console.error(`Error cargando ${layerId}:`, e);
    alert(`Error cargando ${cfg.name}: ${e.message}`);
  }
}

function buildSidebar() {
  const container = document.getElementById('layer-controls');
  container.innerHTML = '';

  for (const cfg of LAYERS) {
    const card = document.createElement('div');
    card.className = 'layer-card';
    card.id = `card-${cfg.id}`;
    card.style.setProperty('--layer-color', cfg.color);
    card.dataset.name = cfg.name.toLowerCase();
    card.dataset.desc = cfg.desc.toLowerCase();

    card.innerHTML = `
      <div class="layer-header">
        <div class="layer-icon"><i class="fas ${cfg.icon}"></i></div>
        <div class="layer-info">
          <div class="layer-name">${cfg.name}</div>
          <div class="layer-desc">${cfg.desc}</div>
        </div>
        <span class="layer-count" id="count-${cfg.id}">--</span>
      </div>
    `;

    card.addEventListener('click', () => toggleLayer(cfg.id));
    container.appendChild(card);
  }
}

function buildLegend() {
  const legend = document.getElementById('legend');
  let html = `<div class="legend-title">Simbologia</div>`;
  for (const cfg of LAYERS) {
    if (cfg.geomType === 'line') {
      html += `<div class="legend-item"><span class="legend-line" style="background:${cfg.color}"></span>${cfg.name}</div>`;
    } else if (cfg.geomType === 'point') {
      html += `<div class="legend-item"><span class="legend-dot" style="background:${cfg.color}"></span>${cfg.name}</div>`;
    } else {
      html += `<div class="legend-item"><span class="legend-swatch" style="background:${cfg.color}33;border:2px solid ${cfg.color}"></span>${cfg.name}</div>`;
    }
  }
  legend.innerHTML = html;
}

function updateUI() {
  for (const cfg of LAYERS) {
    const card = document.getElementById(`card-${cfg.id}`);
    const countEl = document.getElementById(`count-${cfg.id}`);
    if (!card) continue;

    if (activeLayers[cfg.id]) {
      card.classList.add('active');
      countEl.textContent = layerCounts[cfg.id] || 0;
    } else {
      card.classList.remove('active');
      countEl.textContent = '--';
    }
  }

  const statsBar = document.getElementById('stats-bar');
  const loaded = LAYERS.filter(l => activeLayers[l.id]);
  if (loaded.length === 0) {
    statsBar.innerHTML = '';
    return;
  }
  let html = '';
  for (const cfg of loaded) {
    html += `<div class="stat-chip"><span class="dot" style="background:${cfg.color}"></span>${cfg.name}: ${layerCounts[cfg.id]}</div>`;
  }
  statsBar.innerHTML = html;
}

document.getElementById('toggle-sidebar').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('collapsed');
  setTimeout(() => map.invalidateSize(), 350);
});

document.getElementById('search-input').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  document.querySelectorAll('.layer-card').forEach(card => {
    const match = card.dataset.name.includes(q) || card.dataset.desc.includes(q);
    card.style.display = match ? '' : 'none';
  });
});

buildSidebar();
buildLegend();
updateUI();
