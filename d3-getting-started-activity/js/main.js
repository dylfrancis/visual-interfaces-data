console.log("Hello world");

let data;
let years = []; 

// Margin object with properties for the four directions
const margin = {top: 40, right: 50, bottom: 10, left: 50};

// Width and height as the inner dimensions of the chart area
const width = 1000 - margin.left - margin.right;
const height = 1100 - margin.top - margin.bottom;


d3.csv('data/disasters.csv')
  .then(data => {
  	console.log('Data loading complete. Work with dataset.');
    console.log(data);

    // //DATA PROCESSING
    data.forEach( d => { //for each object in the array, pass it as a parameter to this function
      	d.cost = +d.cost; // convert string 'cost' to number
      	d.daysFromYrStart = computeDays(d.midpoint_date); //adding a parameter using a function to compute days

				let tokens = d.midpoint_date.split("-");
  			d.year = +tokens[0];

  	});

    drawChart(data);

})
.catch(error => {
    console.error('Error loading the data ' + error);
});


function drawChart(data){

	console.log("Let's draw a chart!!");
	

	// Define 'svg' as a child-element (g) from the drawing area and include spaces
	// Add <svg> element (drawing space)
	const svg = d3.select('body').append('svg')
	    .attr('width', width + margin.left + margin.right)
	    .attr('height', height + margin.top + margin.bottom)
	    .append('g')
	    .attr('transform', `translate(${margin.left}, ${margin.top})`);


	// Initialize linear and ordinal scales (input domain and output range)

	// xScale: maps days from year start (0-365) to pixel width
	const xScale = d3.scaleLinear()
		.domain([0, 365])
		.range([0, width]);

	// yScale: maps years to height (reversed so max year is at top, min year at bottom)
	// This is reversed because SVG y-coordinates increase downward
	const yScale = d3.scaleLinear()
		.domain([d3.max(data, d => d.year), d3.min(data, d => d.year)])
		.range([0, height]);

	// rScale: maps cost to circle radius (5-100px)
	const rScale = d3.scaleLinear()
		.domain(d3.extent(data, d => d.cost))
		.range([5, 100]);

	// Construct a new ordinal scale with a range of ten categorical colours
	const colorPalette = d3.scaleOrdinal(d3.schemeTableau10) //TRY OTHER COLOR SCHEMES.... https://github.com/d3/d3-scale-chromatic
	colorPalette.domain(["tropical-cyclone", "drought-wildfire", "severe-storm", "flooding"]);

	// Initialize axes
	const xAxis = d3.axisTop(xScale);
	const yAxis = d3.axisLeft(yScale)
		.tickFormat(d3.format("d")); // Format as integer (no commas)

	// Create xAxisGroup and append it to the SVG
	const xAxisGroup = svg.append('g')
		.attr('class', 'axis x-axis')
		.call(xAxis);

	// Create yAxisGroup and append it to the SVG
	const yAxisGroup = svg.append('g')
		.attr('class', 'axis y-axis')
		.call(yAxis);

	// Add circles for each event in the data
	svg.selectAll('circle')
		.data(data)
		.enter()
	  .append('circle')
		.attr('fill', d => colorPalette(d.category))
		.attr('opacity', .8)
		.attr('stroke', "gray")
		.attr('stroke-width', 2)
		.attr('r', d => rScale(d.cost))
		.attr('cy', d => yScale(d.year))
		.attr('cx', d => xScale(d.daysFromYrStart)) 


}


function computeDays(disasterDate){
  	let tokens = disasterDate.split("-");

  	let year = +tokens[0];
  	let month = +tokens[1];
  	let day = +tokens[2];

    return (Date.UTC(year, month-1, day) - Date.UTC(year, 0, 0)) / 24 / 60 / 60 / 1000 ;

  }