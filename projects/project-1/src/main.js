import './style.css';
import * as d3 from 'd3';

const margin = { top: 20, right: 30, bottom: 50, left: 60 };
const width = 900 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

// Tooltip shared across charts
const tooltip = d3.select('body')
  .append('div')
  .attr('class', 'tooltip')
  .style('opacity', 0);

async function loadData() {
  const [literacyRaw, internetRaw] = await Promise.all([
    d3.csv('/data/cross-country-literacy-rates.csv'),
    d3.csv('/data/share-of-individuals-using-the-internet.csv'),
  ]);

  // For each country, take the most recent year's value
  function mostRecent(rows, valueCol) {
    const byEntity = d3.group(rows, d => d.Entity);
    const result = [];
    for (const [entity, entries] of byEntity) {
      // Filter to entries with a valid Code (countries only, not aggregates)
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

  return { literacy, internet, merged };
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
    .call(d3.axisBottom(x));

  svg.append('text')
    .attr('x', width / 2)
    .attr('y', height + 40)
    .attr('text-anchor', 'middle')
    .attr('font-size', '0.85rem')
    .text(label);

  // Y axis
  svg.append('g')
    .call(d3.axisLeft(y));

  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', -45)
    .attr('text-anchor', 'middle')
    .attr('font-size', '0.85rem')
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
    .call(d3.axisBottom(x));

  svg.append('text')
    .attr('x', width / 2)
    .attr('y', height + 40)
    .attr('text-anchor', 'middle')
    .attr('font-size', '0.85rem')
    .text('Literacy Rate (%)');

  // Y axis
  svg.append('g')
    .call(d3.axisLeft(y));

  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', -45)
    .attr('text-anchor', 'middle')
    .attr('font-size', '0.85rem')
    .text('Internet Usage (%)');

  // Dots
  svg.selectAll('circle')
    .data(data)
    .join('circle')
    .attr('cx', d => x(d.literacy))
    .attr('cy', d => y(d.internet))
    .attr('r', 5)
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

async function main() {
  const { literacy, internet, merged } = await loadData();

  drawHistogram('#histogram-literacy', literacy, 'Literacy Rate (%)', '#3b82f6');
  drawHistogram('#histogram-internet', internet, 'Internet Usage (% of population)', '#10b981');
  drawScatterplot('#scatterplot', merged);
}

await main();
