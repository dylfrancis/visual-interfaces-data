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

async function loadData() {
  const [literacyRaw, internetRaw, world] = await Promise.all([
    d3.csv('/data/cross-country-literacy-rates.csv'),
    d3.csv('/data/share-of-individuals-using-the-internet.csv'),
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

  const literacy = mostRecent(literacyRaw, 'Literacy rate');
  const internet = mostRecent(internetRaw, 'Share of the population using the Internet');

  // Merge on entity name
  const internetMap = new Map(internet.map(d => [d.entity, d]));
  const merged = [];
  for (const lit of literacy) {
    const net = internetMap.get(lit.entity);
    if (net) {
      merged.push({
        entity: lit.entity,
        code: lit.code,
        literacy: lit.value,
        literacyYear: lit.year,
        internet: net.value,
        internetYear: net.year,
      });
    }
  }

  return { literacy, internet, merged, world };
}

function drawHistogram(containerId, data, label, color) {
  const svg = d3.select(containerId)
    .append('svg')
    .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const values = data.map(d => d.value);

  const x = d3.scaleLinear()
    .domain([0, d3.max(values)])
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
    .attr('fill', color)
    .on('mouseover', (event, d) => {
      tooltip.transition().duration(100).style('opacity', 1);
      tooltip.html(`${d.x0.toFixed(1)}–${d.x1.toFixed(1)}%: ${d.length} countries`)
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
    .text(label);

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

function drawScatterplot(containerId, data) {
  const svg = d3.select(containerId)
    .append('svg')
    .attr('viewBox', `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear()
    .domain([0, 100])
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([0, 100])
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
    .text('Literacy Rate (%)');

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
    .text('Internet Usage (%)');

  // Dots
  svg.selectAll('circle')
    .data(data)
    .join('circle')
    .attr('cx', d => x(d.literacy))
    .attr('cy', d => y(d.internet))
    .attr('r', 4)
    .attr('fill', '#6366f1')
    .attr('opacity', 0.7)
    .attr('stroke', '#fff')
    .attr('stroke-width', 0.5)
    .on('mouseover', (event, d) => {
      tooltip.transition().duration(100).style('opacity', 1);
      tooltip.html(
        `<strong>${d.entity}</strong><br>` +
        `Literacy: ${d.literacy.toFixed(1)}% (${d.literacyYear})<br>` +
        `Internet: ${d.internet.toFixed(1)}% (${d.internetYear})`
      )
        .style('left', (event.pageX + 12) + 'px')
        .style('top', (event.pageY - 28) + 'px');
    })
    .on('mouseout', () => {
      tooltip.transition().duration(200).style('opacity', 0);
    });
}

function drawChoropleth(containerId, world, dataArray, label, colorScheme) {
  const mapWidth = 600;
  const mapHeight = 340;
  const mapMargin = { top: 5, right: 10, bottom: 30, left: 10 };

  // Build lookup by country code
  const dataMap = new Map(dataArray.map(d => [d.code, d]));

  // Color scale
  const colorScale = d3.scaleSequential(colorScheme)
    .domain([0, 100]);

  const svg = d3.select(containerId)
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
          `${label}: ${entry.value.toFixed(1)}% (${entry.year})`
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
  const gradientId = `gradient-${containerId.replace('#', '')}`;
  const gradient = defs.append('linearGradient')
    .attr('id', gradientId);

  const nStops = 10;
  for (let i = 0; i <= nStops; i++) {
    gradient.append('stop')
      .attr('offset', `${(i / nStops) * 100}%`)
      .attr('stop-color', colorScale((i / nStops) * 100));
  }

  svg.append('rect')
    .attr('x', legendX)
    .attr('y', legendY)
    .attr('width', legendWidth)
    .attr('height', legendHeight)
    .style('fill', `url(#${gradientId})`);

  // Legend axis
  const legendScale = d3.scaleLinear()
    .domain([0, 100])
    .range([legendX, legendX + legendWidth]);

  svg.append('g')
    .attr('transform', `translate(0,${legendY + legendHeight})`)
    .call(d3.axisBottom(legendScale).ticks(5).tickFormat(d => d + '%'))
    .call(g => g.select('.domain').remove())
    .selectAll('text').style('font-size', '0.55rem');
}

async function main() {
  const { literacy, internet, merged, world } = await loadData();

  drawHistogram('#histogram-literacy', literacy, 'Literacy Rate (%)', '#3b82f6');
  drawHistogram('#histogram-internet', internet, 'Internet Usage (%)', '#10b981');
  drawScatterplot('#scatterplot', merged);

  // Choropleth maps
  drawChoropleth('#choropleth-literacy', world, literacy, 'Literacy Rate', d3.interpolateBlues);
  drawChoropleth('#choropleth-internet', world, internet, 'Internet Usage', d3.interpolateGreens);
}

await main();
