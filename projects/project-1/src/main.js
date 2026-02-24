import './style.css';
import * as d3 from 'd3';

const margin = { top: 15, right: 20, bottom: 40, left: 50 };
const width = 500 - margin.left - margin.right;
const height = 280 - margin.top - margin.bottom;

// Tooltip shared across charts
const tooltip = d3.select('body')
  .append('div')
  .attr('class', 'tooltip')
  .style('opacity', 0);

function positionTooltip(event) {
  const node = tooltip.node();
  const pad = 12;
  const rect = node.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = event.pageX + pad;
  let top = event.pageY - h - pad;

  // Flip left if overflowing right
  if (left + w > vw - pad) left = event.pageX - w - pad;
  // Flip down if overflowing top
  if (top < pad) top = event.pageY + pad;
  // Clamp bottom
  if (top + h > vh - pad) top = vh - h - pad;

  tooltip.style('left', left + 'px').style('top', top + 'px');
}

// Attribute configuration
const ATTRIBUTES = {
  literacy: {
    label: 'Literacy Rate',
    unit: '%',
    domain: [0, 100],
    color: '#3b82f6',
    interpolate: d3.interpolateBlues,
    format: v => v.toFixed(1) + '%',
  },
  internet: {
    label: 'Internet Usage',
    unit: '%',
    domain: [0, 100],
    color: '#10b981',
    interpolate: d3.interpolateGreens,
    format: v => v.toFixed(1) + '%',
  },
  gdp: {
    label: 'GDP per Capita',
    unit: '$',
    domain: null,
    color: '#f59e0b',
    interpolate: d3.interpolateOranges,
    format: v => '$' + Math.round(v).toLocaleString(),
  },
  lifeExpectancy: {
    label: 'Life Expectancy',
    unit: 'years',
    domain: null,
    color: '#ef4444',
    interpolate: d3.interpolateReds,
    format: v => v.toFixed(1) + ' yrs',
  },
};

// Each brush stores its own selected entity set keyed by brushId.
// The final highlight is the intersection of all active brushes.
const activeBrushes = new Map();

let highlightCallbacks = [];
let brushSelections = [];

function computeIntersection() {
  const sets = [...activeBrushes.values()];
  if (sets.length === 0) return null;
  let result = new Set(sets[0]);
  for (let i = 1; i < sets.length; i++) {
    result = new Set([...result].filter(e => sets[i].has(e)));
  }
  return result;
}

function broadcastHighlight(entities, brushId) {
  if (entities) {
    activeBrushes.set(brushId, entities);
  } else {
    activeBrushes.delete(brushId);
  }
  const combined = computeIntersection();
  for (const cb of highlightCallbacks) cb(combined);
}

function clearAllBrushes() {
  for (const bs of brushSelections) {
    bs.group.call(bs.brush.move, null);
  }
  activeBrushes.clear();
  for (const cb of highlightCallbacks) cb(null);
}

async function loadData() {
  const base = import.meta.env.BASE_URL;
  const [literacyRaw, internetRaw, gdpRaw, lifeExpRaw, world] = await Promise.all([
    d3.csv(`${base}data/cross-country-literacy-rates.csv`),
    d3.csv(`${base}data/share-of-individuals-using-the-internet.csv`),
    d3.csv(`${base}data/gdp-per-capita-worldbank.csv`),
    d3.csv(`${base}data/life-expectancy-hmd-unwpp.csv`),
    d3.json(`${base}data/world.json`),
  ]);

  function mostRecent(rows, valueCol) {
    const byEntity = d3.group(rows, d => d.Entity);
    const result = [];
    for (const [entity, entries] of byEntity) {
      const withCode = entries.filter(d => d.Code && d.Code.trim() !== '');
      if (withCode.length === 0) continue;
      const latest = withCode.reduce((a, b) => (+a.Year > +b.Year ? a : b));
      const val = +latest[valueCol];
      if (isNaN(val)) continue;
      result.push({ entity, code: latest.Code, year: +latest.Year, value: val });
    }
    return result;
  }

  const datasets = {
    literacy: mostRecent(literacyRaw, 'Literacy rate'),
    internet: mostRecent(internetRaw, 'Share of the population using the Internet'),
    gdp: mostRecent(gdpRaw, 'GDP per capita'),
    lifeExpectancy: mostRecent(lifeExpRaw, 'Life expectancy at birth, totals, period'),
  };

  return { datasets, world };
}

function mergeDatasets(dataA, dataB) {
  const mapB = new Map(dataB.map(d => [d.entity, d]));
  const merged = [];
  for (const a of dataA) {
    const b = mapB.get(a.entity);
    if (b) {
      merged.push({
        entity: a.entity,
        code: a.code,
        xValue: a.value,
        xYear: a.year,
        yValue: b.value,
        yYear: b.year,
      });
    }
  }
  return merged;
}

function drawHistogram(containerId, data, attrKey, brushId) {
  const cfg = ATTRIBUTES[attrKey];
  const container = d3.select(containerId);
  container.selectAll('*').remove();

  const svg = container
    .append('svg')
    .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const values = data.map(d => d.value);
  const domain = cfg.domain || [0, d3.max(values)];

  const x = d3.scaleLinear()
    .domain(domain)
    .nice()
    .range([0, width]);

  const bins = d3.bin()
    .domain(x.domain())
    .thresholds(x.ticks(20))(values);

  const entityToBin = new Map();
  for (const d of data) {
    for (let i = 0; i < bins.length; i++) {
      const bin = bins[i];
      if (d.value >= bin.x0 && (d.value < bin.x1 || (i === bins.length - 1 && d.value <= bin.x1))) {
        entityToBin.set(d.entity, i);
        break;
      }
    }
  }

  const y = d3.scaleLinear()
    .domain([0, d3.max(bins, d => d.length)])
    .nice()
    .range([height, 0]);

  const brush = d3.brushX()
    .extent([[0, 0], [width, height]])
    .on('start brush end', (event) => {
      if (!event.sourceEvent) return;
      const sel = event.selection;
      if (!sel) {
        broadcastHighlight(null, brushId);
        return;
      }
      const [x0, x1] = sel.map(x.invert);
      const entities = new Set();
      for (const d of data) {
        if (d.value >= x0 && d.value <= x1) entities.add(d.entity);
      }
      broadcastHighlight(entities, brushId);
    });

  const brushGroup = svg.append('g')
    .attr('class', 'brush')
    .call(brush);

  brushSelections.push({ group: brushGroup, brush });

  const bars = svg.selectAll('rect.bar')
    .data(bins)
    .join('rect')
    .attr('class', 'bar')
    .attr('x', d => x(d.x0) + 1)
    .attr('y', d => y(d.length))
    .attr('width', d => Math.max(0, x(d.x1) - x(d.x0) - 1))
    .attr('height', d => height - y(d.length))
    .attr('fill', cfg.color)
    .style('pointer-events', 'all')
    .on('mouseover', (event, d) => {
      tooltip.transition().duration(100).style('opacity', 1);
      tooltip.html(`${cfg.format(d.x0)}–${cfg.format(d.x1)}: ${d.length} countries`);
      positionTooltip(event);
    })
    .on('mouseout', () => {
      tooltip.transition().duration(200).style('opacity', 0);
    });

  // X axis
  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(6))
    .selectAll('text').style('font-size', '0.65rem');

  svg.append('text')
    .attr('x', width / 2)
    .attr('y', height + 32)
    .attr('text-anchor', 'middle')
    .attr('font-size', '0.7rem')
    .text(`${cfg.label} (${cfg.unit})`);

  // Y axis
  svg.append('g')
    .call(d3.axisLeft(y).ticks(5))
    .selectAll('text').style('font-size', '0.65rem');

  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', -35)
    .attr('text-anchor', 'middle')
    .attr('font-size', '0.7rem')
    .text('Number of Countries');

  highlightCallbacks.push((entities) => {
    if (!entities) {
      bars.attr('opacity', 1);
      return;
    }
    bars.attr('opacity', (d, i) => {
      for (const dd of data) {
        if (entityToBin.get(dd.entity) === i && entities.has(dd.entity)) return 1;
      }
      return 0.15;
    });
  });
}

function drawScatterplot(containerId, merged, xKey, yKey) {
  const xCfg = ATTRIBUTES[xKey];
  const yCfg = ATTRIBUTES[yKey];
  const container = d3.select(containerId);
  container.selectAll('*').remove();

  const svg = container
    .append('svg')
    .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const xDomain = xCfg.domain || d3.extent(merged, d => d.xValue);
  const yDomain = yCfg.domain || d3.extent(merged, d => d.yValue);

  const x = d3.scaleLinear().domain(xDomain).nice().range([0, width]);
  const y = d3.scaleLinear().domain(yDomain).nice().range([height, 0]);

  // X axis
  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(6))
    .selectAll('text').style('font-size', '0.65rem');

  svg.append('text')
    .attr('x', width / 2)
    .attr('y', height + 32)
    .attr('text-anchor', 'middle')
    .attr('font-size', '0.7rem')
    .text(`${xCfg.label} (${xCfg.unit})`);

  // Y axis
  svg.append('g')
    .call(d3.axisLeft(y).ticks(5))
    .selectAll('text').style('font-size', '0.65rem');

  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', -35)
    .attr('text-anchor', 'middle')
    .attr('font-size', '0.7rem')
    .text(`${yCfg.label} (${yCfg.unit})`);

  const brush = d3.brush()
    .extent([[0, 0], [width, height]])
    .on('start brush end', (event) => {
      if (!event.sourceEvent) return;
      const sel = event.selection;
      if (!sel) {
        broadcastHighlight(null, 'scatter');
        return;
      }
      const [[bx0, by0], [bx1, by1]] = sel;
      const entities = new Set();
      for (const d of merged) {
        const cx = x(d.xValue);
        const cy = y(d.yValue);
        if (cx >= bx0 && cx <= bx1 && cy >= by0 && cy <= by1) {
          entities.add(d.entity);
        }
      }
      broadcastHighlight(entities, 'scatter');
    });

  const brushGroup = svg.append('g')
    .attr('class', 'brush')
    .call(brush);

  brushSelections.push({ group: brushGroup, brush });

  const dots = svg.selectAll('circle')
    .data(merged)
    .join('circle')
    .attr('cx', d => x(d.xValue))
    .attr('cy', d => y(d.yValue))
    .attr('r', 4)
    .attr('fill', yCfg.color)
    .attr('opacity', 0.7)
    .attr('stroke', '#fff')
    .attr('stroke-width', 0.5)
    .style('pointer-events', 'all')
    .on('mouseover', (event, d) => {
      tooltip.transition().duration(100).style('opacity', 1);
      tooltip.html(
        `<strong>${d.entity}</strong><br>` +
        `${xCfg.label}: ${xCfg.format(d.xValue)} (${d.xYear})<br>` +
        `${yCfg.label}: ${yCfg.format(d.yValue)} (${d.yYear})`
      );
      positionTooltip(event);
    })
    .on('mouseout', () => {
      tooltip.transition().duration(200).style('opacity', 0);
    });

  highlightCallbacks.push((entities) => {
    if (!entities) {
      dots.attr('opacity', 0.7).attr('r', 4);
      return;
    }
    dots
      .attr('opacity', d => entities.has(d.entity) ? 0.9 : 0.08)
      .attr('r', d => entities.has(d.entity) ? 5 : 3);
  });
}

function drawChoropleth(containerId, world, dataArray, attrKey, brushId) {
  const cfg = ATTRIBUTES[attrKey];
  const mapWidth = 600;
  const mapHeight = 340;
  const mapMargin = { top: 5, right: 10, bottom: 30, left: 10 };

  const container = d3.select(containerId);
  container.selectAll('*').remove();

  const dataMap = new Map(dataArray.map(d => [d.code, d]));
  new Map(dataArray.map(d => [d.entity, d.code]));
  const values = dataArray.map(d => d.value);
  const domain = cfg.domain || [0, d3.max(values)];
  const colorScale = d3.scaleSequential(cfg.interpolate).domain(domain);

  const svg = container
    .append('svg')
    .attr('viewBox', `0 0 ${mapWidth} ${mapHeight}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  const g = svg.append('g')
    .attr('transform', `translate(${mapMargin.left},${mapMargin.top})`);

  const innerWidth = mapWidth - mapMargin.left - mapMargin.right;
  const innerHeight = mapHeight - mapMargin.top - mapMargin.bottom;

  const projection = d3.geoNaturalEarth1()
    .fitSize([innerWidth, innerHeight], world);
  const path = d3.geoPath().projection(projection);

  const codeToEntity = new Map(dataArray.map(d => [d.code, d.entity]));

  const paths = g.selectAll('path')
    .data(world.features)
    .join('path')
    .attr('d', path)
    .attr('fill', d => {
      const entry = dataMap.get(d.id);
      return entry ? colorScale(entry.value) : '#ddd';
    })
    .attr('stroke', '#999')
    .attr('stroke-width', 0.3)
    .on('mouseover', (event, d) => {
      const entry = dataMap.get(d.id);
      tooltip.transition().duration(100).style('opacity', 1);
      if (entry) {
        tooltip.html(
          `<strong>${d.properties.name}</strong><br>` +
          `${cfg.label}: ${cfg.format(entry.value)} (${entry.year})`
        );
      } else {
        tooltip.html(`<strong>${d.properties.name}</strong><br>No data`);
      }
      positionTooltip(event);
      d3.select(event.currentTarget)
        .attr('stroke', '#333')
        .attr('stroke-width', 1.2);
    })
    .on('mouseout', (event) => {
      tooltip.transition().duration(200).style('opacity', 0);
      d3.select(event.currentTarget)
        .attr('stroke', '#999')
        .attr('stroke-width', 0.3);
    });

  // Precompute centroids for brush hit for countries
  const centroids = new Map();
  for (const feature of world.features) {
    const [cx, cy] = path.centroid(feature);
    if (!isNaN(cx) && !isNaN(cy)) {
      centroids.set(feature.id, [cx, cy]);
    }
  }

  const brush = d3.brush()
    .extent([[0, 0], [innerWidth, innerHeight]])
    .on('start brush end', (event) => {
      if (!event.sourceEvent) return;
      const sel = event.selection;
      if (!sel) {
        broadcastHighlight(null, brushId);
        return;
      }
      const [[bx0, by0], [bx1, by1]] = sel;
      const entities = new Set();
      for (const feature of world.features) {
        const c = centroids.get(feature.id);
        if (!c) continue;
        const [cx, cy] = c;
        if (cx >= bx0 && cx <= bx1 && cy >= by0 && cy <= by1) {
          const ent = codeToEntity.get(feature.id);
          if (ent) entities.add(ent);
        }
      }
      broadcastHighlight(entities, brushId);
    });

  const brushGroup = g.append('g')
    .attr('class', 'brush')
    .call(brush);

  brushSelections.push({ group: brushGroup, brush });

  // Mode toggle: hover (default) vs brush
  // In hover mode, brush overlay is hidden so paths get pointer events
  // In brush mode, brush overlay is on top and paths are non-interactive
  function setMapMode(mode) {
    if (mode === 'brush') {
      brushGroup.style('display', null);
      paths.style('pointer-events', 'none');
    } else {
      brushGroup.style('display', 'none');
      paths.style('pointer-events', 'visiblePainted');
    }
  }

  // Start in hover mode
  setMapMode('hover');

  // Wire up the toggle button for this map (button is a sibling in the parent section)
  const section = d3.select(container.node().parentNode);
  const toggleBtn = section.select('.map-mode-toggle');
  if (!toggleBtn.empty()) {
    // Reset button state on redraw
    toggleBtn.attr('data-mode', 'hover').text('Switch to Brush');
    toggleBtn.on('click', () => {
      const currentMode = toggleBtn.attr('data-mode');
      const newMode = currentMode === 'hover' ? 'brush' : 'hover';
      toggleBtn.attr('data-mode', newMode);
      toggleBtn.text(newMode === 'hover' ? 'Switch to Brush' : 'Switch to Hover');
      setMapMode(newMode);
    });
  }

  // Legend
  const legendWidth = 200;
  const legendHeight = 10;
  const legendX = (mapWidth - legendWidth) / 2;
  const legendY = mapHeight - 18;

  const defs = svg.append('defs');
  const gradientId = `gradient-${containerId.replace('#', '')}-${attrKey}`;
  const gradient = defs.append('linearGradient').attr('id', gradientId);

  const nStops = 10;
  for (let i = 0; i <= nStops; i++) {
    const t = i / nStops;
    gradient.append('stop')
      .attr('offset', `${t * 100}%`)
      .attr('stop-color', colorScale(domain[0] + t * (domain[1] - domain[0])));
  }

  svg.append('rect')
    .attr('x', legendX).attr('y', legendY)
    .attr('width', legendWidth).attr('height', legendHeight)
    .style('fill', `url(#${gradientId})`);

  const legendScale = d3.scaleLinear().domain(domain).range([legendX, legendX + legendWidth]);

  const tickFormat = cfg.unit === '$'
    ? d => '$' + d3.format('~s')(d)
    : cfg.unit === 'years'
      ? d => d + 'yr'
      : d => d + '%';

  svg.append('g')
    .attr('transform', `translate(0,${legendY + legendHeight})`)
    .call(d3.axisBottom(legendScale).ticks(5).tickFormat(tickFormat))
    .call(g => g.select('.domain').remove())
    .selectAll('text').style('font-size', '0.55rem');

  highlightCallbacks.push((entities) => {
    if (!entities) {
      paths.attr('opacity', 1);
      return;
    }
    paths.attr('opacity', d => {
      const ent = codeToEntity.get(d.id);
      if (ent && entities.has(ent)) return 1;
      // No data countries stay dimmed
      return 0.15;
    });
  });
}

function renderAll(datasets, world, xKey, yKey) {
  // Reset highlight state on full redraw
  highlightCallbacks = [];
  brushSelections = [];
  activeBrushes.clear();

  const xData = datasets[xKey];
  const yData = datasets[yKey];
  const xCfg = ATTRIBUTES[xKey];
  const yCfg = ATTRIBUTES[yKey];
  const merged = mergeDatasets(xData, yData);

  d3.select('#title-hist-x').text(`Distribution of ${xCfg.label}`);
  d3.select('#title-hist-y').text(`Distribution of ${yCfg.label}`);
  d3.select('#title-scatter').text(`${xCfg.label} vs. ${yCfg.label}`);
  d3.select('#title-map-x').text(`${xCfg.label} by Country`);
  d3.select('#title-map-y').text(`${yCfg.label} by Country`);

  drawHistogram('#histogram-x', xData, xKey, 'hist-x');
  drawHistogram('#histogram-y', yData, yKey, 'hist-y');
  drawScatterplot('#scatterplot', merged, xKey, yKey);
  drawChoropleth('#choropleth-x', world, xData, xKey, 'map-x');
  drawChoropleth('#choropleth-y', world, yData, yKey, 'map-y');
}

async function main() {
  const { datasets, world } = await loadData();

  const selectX = document.getElementById('select-x');
  const selectY = document.getElementById('select-y');
  const resetBtn = document.getElementById('reset-brush');

  function update() {
    renderAll(datasets, world, selectX.value, selectY.value);
  }

  selectX.addEventListener('change', update);
  selectY.addEventListener('change', update);
  resetBtn.addEventListener('click', clearAllBrushes);

  update();
}

await main();
