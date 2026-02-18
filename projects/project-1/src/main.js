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

// Attribute configuration: color, scheme, domain, units
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
    domain: null, // auto
    color: '#f59e0b',
    interpolate: d3.interpolateOranges,
    format: v => '$' + Math.round(v).toLocaleString(),
  },
  lifeExpectancy: {
    label: 'Life Expectancy',
    unit: 'years',
    domain: null, // auto
    color: '#ef4444',
    interpolate: d3.interpolateReds,
    format: v => v.toFixed(1) + ' yrs',
  },
};

async function loadData() {
  const [literacyRaw, internetRaw, gdpRaw, lifeExpRaw, world] = await Promise.all([
    d3.csv('/data/cross-country-literacy-rates.csv'),
    d3.csv('/data/share-of-individuals-using-the-internet.csv'),
    d3.csv('/data/gdp-per-capita-worldbank.csv'),
    d3.csv('/data/life-expectancy-hmd-unwpp.csv'),
    d3.json('/data/world.json'),
  ]);

  // For each country, take the most recent year's value
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

function mergeDatasets(dataA, dataB, keyA, keyB) {
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

function drawHistogram(containerId, data, attrKey) {
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

  const y = d3.scaleLinear()
    .domain([0, d3.max(bins, d => d.length)])
    .nice()
    .range([height, 0]);

  // Bars
  svg.selectAll('rect')
    .data(bins)
    .join('rect')
    .attr('x', d => x(d.x0) + 1)
    .attr('y', d => y(d.length))
    .attr('width', d => Math.max(0, x(d.x1) - x(d.x0) - 1))
    .attr('height', d => height - y(d.length))
    .attr('fill', cfg.color)
    .on('mouseover', (event, d) => {
      tooltip.transition().duration(100).style('opacity', 1);
      tooltip.html(`${cfg.format(d.x0)}–${cfg.format(d.x1)}: ${d.length} countries`)
        .style('left', (event.pageX + 12) + 'px')
        .style('top', (event.pageY - 28) + 'px');
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

  const x = d3.scaleLinear()
    .domain(xDomain)
    .nice()
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain(yDomain)
    .nice()
    .range([height, 0]);

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

  // Dots — colored by Y-axis attribute
  svg.selectAll('circle')
    .data(merged)
    .join('circle')
    .attr('cx', d => x(d.xValue))
    .attr('cy', d => y(d.yValue))
    .attr('r', 4)
    .attr('fill', yCfg.color)
    .attr('opacity', 0.7)
    .attr('stroke', '#fff')
    .attr('stroke-width', 0.5)
    .on('mouseover', (event, d) => {
      tooltip.transition().duration(100).style('opacity', 1);
      tooltip.html(
        `<strong>${d.entity}</strong><br>` +
        `${xCfg.label}: ${xCfg.format(d.xValue)} (${d.xYear})<br>` +
        `${yCfg.label}: ${yCfg.format(d.yValue)} (${d.yYear})`
      )
        .style('left', (event.pageX + 12) + 'px')
        .style('top', (event.pageY - 28) + 'px');
    })
    .on('mouseout', () => {
      tooltip.transition().duration(200).style('opacity', 0);
    });
}

function drawChoropleth(containerId, world, dataArray, attrKey) {
  const cfg = ATTRIBUTES[attrKey];
  const mapWidth = 600;
  const mapHeight = 340;
  const mapMargin = { top: 5, right: 10, bottom: 30, left: 10 };

  const container = d3.select(containerId);
  container.selectAll('*').remove();

  // Build lookup by country code
  const dataMap = new Map(dataArray.map(d => [d.code, d]));

  // Color scale
  const values = dataArray.map(d => d.value);
  const domain = cfg.domain || [0, d3.max(values)];
  const colorScale = d3.scaleSequential(cfg.interpolate)
    .domain(domain);

  const svg = container
    .append('svg')
    .attr('viewBox', `0 0 ${mapWidth} ${mapHeight}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  const g = svg.append('g')
    .attr('transform', `translate(${mapMargin.left},${mapMargin.top})`);

  const innerWidth = mapWidth - mapMargin.left - mapMargin.right;
  const innerHeight = mapHeight - mapMargin.top - mapMargin.bottom;

  // Projection
  const projection = d3.geoNaturalEarth1()
    .fitSize([innerWidth, innerHeight], world);

  const path = d3.geoPath().projection(projection);

  // Draw countries
  g.selectAll('path')
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
      tooltip
        .style('left', (event.pageX + 12) + 'px')
        .style('top', (event.pageY - 28) + 'px');

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

  // Legend
  const legendWidth = 200;
  const legendHeight = 10;
  const legendX = (mapWidth - legendWidth) / 2;
  const legendY = mapHeight - 18;

  // Gradient
  const defs = svg.append('defs');
  const gradientId = `gradient-${containerId.replace('#', '')}-${attrKey}`;
  const gradient = defs.append('linearGradient')
    .attr('id', gradientId);

  const nStops = 10;
  for (let i = 0; i <= nStops; i++) {
    const t = i / nStops;
    gradient.append('stop')
      .attr('offset', `${t * 100}%`)
      .attr('stop-color', colorScale(domain[0] + t * (domain[1] - domain[0])));
  }

  svg.append('rect')
    .attr('x', legendX)
    .attr('y', legendY)
    .attr('width', legendWidth)
    .attr('height', legendHeight)
    .style('fill', `url(#${gradientId})`);

  // Legend axis
  const legendScale = d3.scaleLinear()
    .domain(domain)
    .range([legendX, legendX + legendWidth]);

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
}

function renderAll(datasets, world, xKey, yKey) {
  const xData = datasets[xKey];
  const yData = datasets[yKey];
  const xCfg = ATTRIBUTES[xKey];
  const yCfg = ATTRIBUTES[yKey];
  const merged = mergeDatasets(xData, yData, xKey, yKey);

  // Update chart titles
  d3.select('#title-hist-x').text(`Distribution of ${xCfg.label}`);
  d3.select('#title-hist-y').text(`Distribution of ${yCfg.label}`);
  d3.select('#title-scatter').text(`${xCfg.label} vs. ${yCfg.label}`);
  d3.select('#title-map-x').text(`${xCfg.label} by Country`);
  d3.select('#title-map-y').text(`${yCfg.label} by Country`);

  // Draw all charts
  drawHistogram('#histogram-x', xData, xKey);
  drawHistogram('#histogram-y', yData, yKey);
  drawScatterplot('#scatterplot', merged, xKey, yKey);
  drawChoropleth('#choropleth-x', world, xData, xKey);
  drawChoropleth('#choropleth-y', world, yData, yKey);
}

async function main() {
  const { datasets, world } = await loadData();

  const selectX = document.getElementById('select-x');
  const selectY = document.getElementById('select-y');

  function update() {
    renderAll(datasets, world, selectX.value, selectY.value);
  }

  selectX.addEventListener('change', update);
  selectY.addEventListener('change', update);

  // Initial render
  update();
}

await main();
