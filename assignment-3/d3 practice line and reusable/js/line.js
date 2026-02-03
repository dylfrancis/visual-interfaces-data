class LineChart {

  constructor(_config, _data) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 500,
      containerHeight: _config.containerHeight || 140,
      margin: { top: 10, bottom: 30, right: 10, left: 30 }
    }

    this.data = _data;

    // Call a class function
    this.initVis();
  }

  initVis() {
    let vis = this;

    // Calculate inner chart dimensions
    vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
    vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

    // Define accessor functions
    vis.xValue = d => d.year;
    vis.yValue = d => d.cost;

    // Initialize scales
    vis.xScale = d3.scaleLinear()
      .domain(d3.extent(vis.data, vis.xValue))
      .range([0, vis.width]);

    vis.yScale = d3.scaleLinear()
      .domain(d3.extent(vis.data, vis.yValue))
      .range([vis.height, 0])
      .nice();

    // Initialize axes
    vis.xAxis = d3.axisBottom(vis.xScale).tickFormat(d3.format('d'));
    vis.yAxis = d3.axisLeft(vis.yScale);

    // Define the line generator
    vis.line = d3.line()
      .x(d => vis.xScale(vis.xValue(d)))
      .y(d => vis.yScale(vis.yValue(d)));

    // Create SVG element
    vis.svg = d3.select(vis.config.parentElement)
      .append('svg')
      .attr('width', vis.config.containerWidth)
      .attr('height', vis.config.containerHeight);

    // Append group element for the chart area with margins
    vis.chart = vis.svg.append('g')
      .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

    // Append x-axis group
    vis.xAxisG = vis.chart.append('g')
      .attr('class', 'axis x-axis')
      .attr('transform', `translate(0,${vis.height})`)
      .call(vis.xAxis);

    // Append y-axis group
    vis.yAxisG = vis.chart.append('g')
      .attr('class', 'axis y-axis')
      .call(vis.yAxis);

    // Add line path
    vis.chart.append('path')
      .data([vis.data])
      .attr('class', 'chart-line')
      .attr('d', vis.line)
      .attr('fill', 'none')
      .attr('stroke', 'steelblue')
      .attr('stroke-width', 2);

    //this.updateVis(); //leave this empty for now...
  }


 //  //leave this empty for now
 // updateVis() { 
   
 //   this.renderVis(); 

 // }


 // //leave this empty for now...
 // renderVis() { 

 //  }



}