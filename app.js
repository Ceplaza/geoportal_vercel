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
    displayFields: ['taxon_orde', 'taxon_fami', 'taxon_spec'],
    extraDisplayFields: { taxon_orde: 'Orden', taxon_fami: 'Familia', taxon_spec: 'Especie' },
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
    displayFields: ['name', 'amenity', 'faculty', 'height', 'opening_ho', 'type', 'ec_campus'],
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
    displayFields: ['taxon_orde', 'taxon_fami', 'taxon_genu'],
    imageField: 'image_url',
    linkField: 'url',
    labelField: 'common_nam',
    isFlora: true,
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

const LAYER_METADATA = {
  areas_verdes_geom: {
    source: 'OpenStreetMap / Datos municipales',
    srs: 'WGS 84 (EPSG:4326)',
    fields: ['name', 'tipo', 'direccion', 'area_ha', 'codigo'],
    updateDate: '2024',
    responsible: 'Municipio de Cuenca'
  },
  ave_ucuenca: {
    source: 'iNaturalist (observaciones de aves)',
    srs: 'WGS 84 (EPSG:4326)',
    fields: ['common_nam', 'taxon_orde', 'taxon_fami', 'taxon_spec', 'image_url', 'url'],
    updateDate: 'Continua',
    responsible: 'iNaturalist / Universidad de Cuenca'
  },
  emplazamiento_ucuenca: {
    source: 'OpenStreetMap (edificios UCuenca)',
    srs: 'WGS 84 (EPSG:4326)',
    fields: ['name', 'amenity', 'faculty', 'height', 'opening_ho', 'type', 'ec_campus'],
    updateDate: '2024',
    responsible: 'Universidad de Cuenca'
  },
  flora_ucuenca: {
    source: 'iNaturalist (observaciones de flora)',
    srs: 'WGS 84 (EPSG:4326)',
    fields: ['common_nam', 'scientific', 'taxon_orde', 'taxon_fami', 'taxon_genu', 'image_url', 'url'],
    updateDate: 'Continua',
    responsible: 'iNaturalist / Universidad de Cuenca'
  },
  rios_cuenca: {
    source: 'OpenStreetMap (rios y quebradas)',
    srs: 'WGS 84 (EPSG:4326)',
    fields: ['name', 'waterway', 'intermitte', 'width', 'source', 'wikidata'],
    updateDate: '2024',
    responsible: 'OpenStreetMap'
  }
};

const map = L.map('map', {
  center: [-2.9000, -79.0050],
  zoom: 13,
  zoomControl: false,
  attributionControl: true
});

L.control.zoom({ position: 'topright' }).addTo(map);

const baseMaps = {
  'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  }),
  'Esri World Imagery': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 18
  }),
  'Carto Positron': L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd', maxZoom: 19
  }),
  'Carto Dark Matter': L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd', maxZoom: 19
  })
};
baseMaps['OpenStreetMap'].addTo(map);

const BaseMapControl = L.Control.extend({
  options: { position: 'topright' },
  onAdd: function(map) {
    const container = L.DomUtil.create('div', 'leaflet-control-basemap');
    const icons = { 'OpenStreetMap': 'fa-map', 'Esri World Imagery': 'fa-satellite', 'Carto Positron': 'fa-circle', 'Carto Dark Matter': 'fa-moon' };
    Object.keys(baseMaps).forEach(function(name) {
      const btn = L.DomUtil.create('button', 'basemap-btn', container);
      btn.title = name;
      btn.innerHTML = '<i class="fas ' + (icons[name] || 'fa-globe') + '"></i>';
      if (name === 'OpenStreetMap') btn.classList.add('active');
      btn.addEventListener('click', function() {
        Object.values(baseMaps).forEach(function(layer) { map.removeLayer(layer); });
        baseMaps[name].addTo(map);
        container.querySelectorAll('.basemap-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
      });
      L.DomEvent.disableClickPropagation(btn);
    });
    return container;
  }
});
new BaseMapControl().addTo(map);

const activeLayers = {};
const layerCounts = {};
let floraConteosCache = {};

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

function computeLinearRegression(xArr, yArr) {
  const n = xArr.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += xArr[i];
    sumY += yArr[i];
    sumXY += xArr[i] * yArr[i];
    sumX2 += xArr[i] * xArr[i];
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function buildAvesPopup(props, layerCfg) {
  const color = layerCfg.color;
  const title = props[layerCfg.labelField] || `#${props.gid || ''}`;
  const titleClean = title.charAt(0).toUpperCase() + title.slice(1);

  let html = `<div class="popup-content" style="max-width:300px">`;

  if (props[layerCfg.imageField]) {
    html += `<img class="popup-img" src="${escapeHtml(props[layerCfg.imageField])}" onerror="this.style.display='none'" />`;
  }

  html += `<div style="padding:10px">`;
  html += `<div style="font-size:15px;font-weight:700;margin-bottom:8px;color:#e2e8f0">${escapeHtml(titleClean)}</div>`;
  html += `<div class="popup-grid">`;
  html += `<span class="popup-key">Especie</span><span class="popup-val" style="font-style:italic">${escapeHtml(props.taxon_spec) || ''}</span>`;
  html += `<span class="popup-key">Familia</span><span class="popup-val">${escapeHtml(props.taxon_fami) || ''}</span>`;
  html += `<span class="popup-key">Orden</span><span class="popup-val">${escapeHtml(props.taxon_orde) || ''}</span>`;
  if (props.place_gues) {
    html += `<span class="popup-key">Ubicación</span><span class="popup-val">${escapeHtml(props.place_gues)}</span>`;
  }
  if (props.time_obser) {
    html += `<span class="popup-key">Observación</span><span class="popup-val">${escapeHtml(props.time_obser)}</span>`;
  }
  html += `</div>`;

  if (props[layerCfg.linkField]) {
    html += `<a class="popup-link" href="${escapeHtml(props[layerCfg.linkField])}" target="_blank"><i class="fas fa-external-link-alt"></i> Ver en iNaturalist</a>`;
  }
  html += `</div></div>`;
  return html;
}

async function loadFloraConteos() {
  if (Object.keys(floraConteosCache).length > 0) return floraConteosCache;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/flora_conteos_anuales?select=*`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    if (!res.ok) return {};
    const data = await res.json();
    for (const row of data) {
      const key = (row.scientific || '').toLowerCase().trim();
      floraConteosCache[key] = row;
    }
  } catch(e) { console.warn('No se pudo cargar flora_conteos_anuales:', e); }
  return floraConteosCache;
}

function buildFloraChartHTML(scientific, canvasId) {
  const key = (scientific || '').toLowerCase().trim();
  const row = floraConteosCache[key];
  if (!row) return '';

  const years = ['2021','2022','2023','2024','2025'];
  const vals = years.map(y => row[`year_${y}`] || 0);
  if (vals.every(v => v === 0)) return '';

  return `
    <div style="margin-top:8px">
      <div style="font-size:11px;font-weight:600;color:#94a3b8;margin-bottom:4px">Tendencia 2021-2025</div>
      <canvas id="${canvasId}" height="110" width="260"></canvas>
    </div>`;
}

function renderFloraChart(canvasId, scientific) {
  const key = (scientific || '').toLowerCase().trim();
  const row = floraConteosCache[key];
  if (!row) return;

  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const years = ['2021','2022','2023','2024','2025'];
  const vals = years.map(y => row[`year_${y}`] || 0);
  if (vals.every(v => v === 0)) return;

  const xArr = [2021,2022,2023,2024,2025];
  const reg = computeLinearRegression(xArr, vals);
  const regVals = xArr.map(x => Math.round((reg.slope * x + reg.intercept) * 10) / 10);

  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const padT = 14, padB = 8, padL = 5, padR = 5;
  const cW = W - padL - padR, cH = H - padT - padB;
  const maxVal = Math.max.apply(null, vals.concat(regVals)) || 1;
  const barW = cW / vals.length * 0.45;

  ctx.clearRect(0, 0, W, H);

  for (let i = 0; i < vals.length; i++) {
    const x = padL + (cW / vals.length) * i + (cW / vals.length - barW) / 2;
    const h = (vals[i] / maxVal) * cH;
    const y = padT + cH - h;
    ctx.fillStyle = 'rgba(168, 85, 247, 0.6)';
    ctx.fillRect(x, y, barW, h);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(vals[i], x + barW/2, y - 3);
  }

  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 2;
  ctx.setLineDash([4,2]);
  ctx.beginPath();
  for (let i = 0; i < regVals.length; i++) {
    const x = padL + (cW / regVals.length) * i + (cW / regVals.length) / 2;
    const y = padT + cH - (regVals[i] / maxVal) * cH;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#64748b';
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'center';
  for (let i = 0; i < years.length; i++) {
    const x = padL + (cW / years.length) * i + (cW / years.length) / 2;
    ctx.fillText(years[i], x, H - 1);
  }

  ctx.fillStyle = '#10b981';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Tendencia: +' + (Math.round(reg.slope * 10) / 10) + '/año', padL, H - 1);
}

function buildFloraPopup(props, layerCfg) {
  const color = layerCfg.color;
  const title = props[layerCfg.labelField] || '';
  const titleClean = title ? title.charAt(0).toUpperCase() + title.slice(1) : '';
  const canvasId = 'chart-' + (props.gid || Math.random().toString(36).substr(2,9));

  let html = `<div class="popup-content" style="max-width:300px">`;

  if (props[layerCfg.imageField]) {
    html += `<img class="popup-img" src="${escapeHtml(props[layerCfg.imageField])}" onerror="this.style.display='none'" />`;
  }

  html += `<div style="padding:10px">`;
  if (titleClean) {
    html += `<div style="font-size:15px;font-weight:700;margin-bottom:6px;color:#e2e8f0">${escapeHtml(titleClean)}</div>`;
  }
  if (props.scientific) {
    html += `<div style="font-size:12px;font-style:italic;color:#94a3b8;margin-bottom:6px">${escapeHtml(props.scientific)}</div>`;
  }

  html += `<div class="popup-grid">`;
  if (props.taxon_orde) {
    html += `<span class="popup-key">Orden</span><span class="popup-val">${escapeHtml(props.taxon_orde)}</span>`;
  }
  if (props.taxon_fami) {
    html += `<span class="popup-key">Familia</span><span class="popup-val">${escapeHtml(props.taxon_fami)}</span>`;
  }
  if (props.taxon_genu) {
    html += `<span class="popup-key">Género</span><span class="popup-val">${escapeHtml(props.taxon_genu)}</span>`;
  }
  if (props.place_gues) {
    html += `<span class="popup-key">Ubicación</span><span class="popup-val">${escapeHtml(props.place_gues)}</span>`;
  }
  html += `</div>`;

  html += buildFloraChartHTML(props.scientific, canvasId);

  const gid = props.gid;
  html += `
    <div style="margin-top:10px;border-top:1px solid #334155;padding-top:8px">
      <div style="font-size:11px;font-weight:600;color:#94a3b8;margin-bottom:6px">Registrar conteo 2026</div>
      <div style="display:flex;gap:4px;align-items:center">
        <input id="input-2026-${gid}" type="number" min="0" placeholder="Valor"
          style="width:70px;padding:4px 6px;border-radius:4px;border:1px solid #334155;background:#0f172a;color:#e2e8f0;font-size:12px" />
        <button onclick="guardar2026(${gid},'${escapeHtml(props.scientific || '')}','${escapeHtml(props.common_nam || '')}')"
          style="padding:4px 10px;border-radius:4px;border:none;background:#a855f7;color:white;font-size:11px;cursor:pointer;font-weight:600">
          Guardar
        </button>
      </div>
      <div id="msg-2026-${gid}" style="font-size:11px;margin-top:4px"></div>
    </div>`;

  if (props[layerCfg.linkField]) {
    html += `<a class="popup-link" href="${escapeHtml(props[layerCfg.linkField])}" target="_blank"><i class="fas fa-external-link-alt"></i> Ver en iNaturalist</a>`;
  }
  html += `</div></div>`;
  return html;
}

async function guardar2026(gid, scientific, commonNam) {
  const input = document.getElementById(`input-2026-${gid}`);
  const msg = document.getElementById(`msg-2026-${gid}`);
  const val = parseInt(input.value);
  if (isNaN(val) || val < 0) { msg.style.color = '#ef4444'; msg.textContent = 'Ingrese un valor válido'; return; }

  msg.style.color = '#94a3b8'; msg.textContent = 'Guardando...';

  const key = (scientific || '').toLowerCase().trim();
  const existing = floraConteosCache[key];

  if (existing) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/flora_conteos_anuales?gid=eq.${existing.gid}`, {
      method: 'PATCH',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ year_2026: val })
    });
    if (res.ok) {
      floraConteosCache[key].year_2026 = val;
      msg.style.color = '#10b981'; msg.textContent = `Guardado: ${val}`;
    } else {
      msg.style.color = '#ef4444'; msg.textContent = 'Error al guardar';
    }
  } else {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/flora_conteos_anuales`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ scientific, common_nam: commonNam, year_2021: 0, year_2022: 0, year_2023: 0, year_2024: 0, year_2025: 0, year_2026: val })
    });
    if (res.ok) {
      const data = await res.json();
      if (data[0]) floraConteosCache[key] = data[0];
      msg.style.color = '#10b981'; msg.textContent = `Guardado: ${val}`;
    } else {
      msg.style.color = '#ef4444'; msg.textContent = 'Error al guardar';
    }
  }
}

function buildPopup(props, layerCfg) {
  if (layerCfg.id === 'ave_ucuenca') return buildAvesPopup(props, layerCfg);
  if (layerCfg.isFlora) return buildFloraPopup(props, layerCfg);

  const color = layerCfg.color;
  const icon = layerCfg.icon;
  const title = props[layerCfg.labelField] || `#${props.gid || ''}`;

  let html = `<div class="popup-content">`;
  html += `<div class="popup-header">`;
  html += `<div class="popup-badge" style="background:${color}22;color:${color}"><i class="fas ${icon}"></i></div>`;
  html += `<div class="popup-title">${escapeHtml(title)}</div>`;
  html += `</div>`;

  html += `<div class="popup-grid">`;
  for (const field of layerCfg.displayFields) {
    const val = props[field];
    if (val != null && val !== '' && val !== 'null') {
      const cleanKey = layerCfg.extraDisplayFields?.[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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

  if (cfg.isFlora) {
    await loadFloraConteos();
  }

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
          <div class="layer-name">${cfg.name}<button class="info-btn" data-layer="${cfg.id}" title="Metadatos"><i class="fas fa-info-circle"></i></button></div>
          <div class="layer-desc">${cfg.desc}</div>
        </div>
        <span class="layer-count" id="count-${cfg.id}">--</span>
      </div>
    `;

    card.addEventListener('click', () => toggleLayer(cfg.id));
    card.querySelector('.info-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      showMetadata(cfg.id);
    });
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

map.on('popupopen', function(e) {
  const canvas = e.popup.getElement().querySelector('canvas');
  if (canvas && canvas.id) {
    const props = e.popup._source?.feature?.properties;
    if (props) {
      setTimeout(() => renderFloraChart(canvas.id, props.scientific), 50);
    }
  }
});

// === Barra de escala ===
L.control.scale({ position: 'bottomleft', imperial: false, maxWidth: 200 }).addTo(map);

// === Coordenadas del cursor ===
const CoordsControl = L.Control.extend({
  options: { position: 'bottomright' },
  onAdd: function() {
    this._container = L.DomUtil.create('div', 'leaflet-control-coords');
    this._container.title = 'Coordenadas del cursor (WGS84)';
    this._container.innerHTML = '—';
    return this._container;
  },
  update: function(lat, lng) {
    this._container.innerHTML = lat.toFixed(6) + ', ' + lng.toFixed(6);
  }
});
const coordsControl = new CoordsControl().addTo(map);
map.on('mousemove', function(e) { coordsControl.update(e.latlng.lat, e.latlng.lng); });
map.on('mouseout', function() { coordsControl.update(NaN, NaN); });

// === Mi Ubicación ===
const LocationControl = L.Control.extend({
  options: { position: 'topright' },
  onAdd: function() {
    this._btn = L.DomUtil.create('button', 'leaflet-control-location');
    this._btn.title = 'Mi ubicación';
    this._btn.innerHTML = '<i class="fas fa-location-crosshairs"></i>';
    this._btn.addEventListener('click', this._locate.bind(this));
    L.DomEvent.disableClickPropagation(this._btn);
    return this._btn;
  },
  _marker: null,
  _locate: function() {
    if (!navigator.geolocation) { alert('Geolocalización no soportada.'); return; }
    this._btn.classList.add('locating');
    navigator.geolocation.getCurrentPosition(
      function(pos) {
        this._btn.classList.remove('locating');
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (this._marker) map.removeLayer(this._marker);
        this._marker = L.marker([lat, lng], {
          icon: L.divIcon({
            className: 'my-location-icon',
            html: '<div class="pulse-dot"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          })
        }).addTo(map).bindPopup('Mi ubicación').openPopup();
        map.setView([lat, lng], 15);
      }.bind(this),
      function(err) {
        this._btn.classList.remove('locating');
        alert('No se pudo obtener la ubicación: ' + err.message);
      }.bind(this),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }
});
new LocationControl().addTo(map);

// === Panel de metadatos ===
(function() {
  const overlay = document.createElement('div');
  overlay.id = 'metadata-overlay';
  overlay.className = 'metadata-overlay';
  overlay.style.display = 'none';
  overlay.addEventListener('click', function(e) { if (e.target === overlay) closeMetadata(); });
  overlay.innerHTML = '<div class="metadata-modal"><div class="metadata-header"><h3 id="metadata-title"></h3><button class="metadata-close" onclick="closeMetadata()">&times;</button></div><div class="metadata-body" id="metadata-body"></div></div>';
  document.body.appendChild(overlay);
})();

function showMetadata(layerId) {
  var cfg = LAYERS.find(function(l) { return l.id === layerId; });
  var meta = LAYER_METADATA[layerId];
  if (!cfg || !meta) return;

  document.getElementById('metadata-title').innerHTML = '<i class="fas ' + cfg.icon + '" style="color:' + cfg.color + '"></i> ' + cfg.name;

  var count = layerCounts[layerId];
  var rows = [
    ['Descripcion', cfg.desc || '-'],
    ['Fuente', meta.source || '-'],
    ['Tipo de geometria', cfg.geomType || '-'],
    ['Sistema de coordenadas', meta.srs || '-'],
    ['Registros', count != null ? count + ' (cargados)' : 'Capa no cargada'],
    ['Campos principales', meta.fields ? meta.fields.join(', ') : '-'],
    ['Fecha de actualizacion', meta.updateDate || '-'],
    ['Responsable', meta.responsible || '-']
  ];

  var html = '<table class="meta-table">';
  for (var i = 0; i < rows.length; i++) {
    html += '<tr><td class="meta-key">' + rows[i][0] + '</td><td>' + rows[i][1] + '</td></tr>';
  }
  html += '</table>';

  document.getElementById('metadata-body').innerHTML = html;
  document.getElementById('metadata-overlay').style.display = 'flex';
}

function closeMetadata() {
  document.getElementById('metadata-overlay').style.display = 'none';
}

document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeMetadata(); });

buildSidebar();
buildLegend();
updateUI();
