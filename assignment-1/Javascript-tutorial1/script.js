/* High level overview of the code:
 * 1. Read in the data
 * 2. Draw the timeline
 * 3. Iterate over the data, drawing circles for each event based on the formula and data from the csv
 */


console.log("Hello world");


d3.csv('data/disasters.csv')
  .then(data => {  //ARROW function - pass data as a parameter into this anonymous function
  	console.log(data); //here it is!! Look in the console to see what it looks like

	const svg = document.getElementById("vis"); //GRAB that svg!!

	//ok, without using d3, let's add some stuff to the svg
	//		rather than manually, adding using javascript
	//		but - you have to do everything yourself

	//---- DRAWING parameters
	//	These tell you where to put things.  
	const timelineX1 = 50; //the x coordinate where the timeline begins
	const timelineX2 = 950;  // the x coordinate where the timeline ens
	const startOfTimelinesY = 100; //the y coordinate of the 2017 (the top line)
	const gapBetweenTimelines = 25; //how much space to put between lines 
 
	// LINES FOR EACH YEAR
	//		add a line to the svg for each year. 
	//		compute y pos
	for(let yr = 2017; yr >= 1980; yr--){
		let yPos = getYearPosition(yr, gapBetweenTimelines, startOfTimelinesY);

		//add a line svg element to the svg
		drawLine(timelineX1, yPos, timelineX2, yPos, svg);
	}

  for(let i = 0; i<data.length; i++){
  	console.log(data[i]); //look at this using developer tools

  	let cost = +data[i].cost;// convert string 'cost' to number
  	let daysFromStart = computeDays(data[i].start); 

  	let tokens = data[i].start.split("-");
		let year = +tokens[0];

 		//-- position and size the circles
  	//-- select a color based on the disaster type
  	let cx = mapFromDomainToRange(0, 365, timelineX1, timelineX2, daysFromStart);
  	let cy = getYearPosition(year, gapBetweenTimelines, startOfTimelinesY);
  	let radius = mapFromDomainToRange(1, 160, 5, 30, cost);
  	let color = lookupColor(data[i].category);

    // for each event, draw a circle, along the timeline
    drawCircle( cx, cy, radius, color, svg);

  }

    
  })
  .catch(error => console.error(error));

  function computeDays(disasterDate){
  	let tokens = disasterDate.split("-");

  	let year = +tokens[0];
  	let month = +tokens[1];
  	let day = +tokens[2];

    return (Date.UTC(year, month-1, day) - Date.UTC(year, 0, 0)) / 24 / 60 / 60 / 1000 ;

  }


  //------- MAP from data to position, size, color

  //year lines go down the page.  Given a year, where should I put this line on the page? 
  function getYearPosition( year, gapBetweenTimelines, startOfTimelinesY ){

  	return (2017 - year) * gapBetweenTimelines + startOfTimelinesY; 

  }

  //where to put or size elements, mapping from data to 
  function mapFromDomainToRange( domainX1, domainX2, rangeX1, rangeX2, value ){

  	return (value-domainX1)/(domainX2-domainX1) * (rangeX2-rangeX1) + rangeX1; 
  }

  function lookupColor(category){

		if (category === "tropical-cyclone") {
			return "#081d58";
		} else if (category === "drought-wildfire") {
			return "#ffffd9";
		} else if (category === "severe-storm") {
			return "#c7e9b4";
		} else if (category === "winter-storm-freeze") {
			return "#081d58";
		} else if (category === "flooding") {
			return "#41b6c4";
		} else {
			return "#000000";
		}
  }


  //-------- DRAW 

  //here we add a line to the svg in the DOM 
  function drawLine( x1, y1, x2, y2, svg){

		const svgns = "http://www.w3.org/2000/svg"; 
		let newLine = document.createElementNS(svgns, "line");

		newLine.setAttribute("x1", x1);
		newLine.setAttribute("y1", y1);
		newLine.setAttribute("x2", x2);
		newLine.setAttribute("y2", y2); 
		newLine.setAttribute("stroke", "black");
		newLine.setAttribute("stroke-width", 2);

		// append the new line to the svg
		svg.appendChild(newLine);
  }


// here we add a circle element to the svg in the DOM
  function drawCircle( cx, cy, radius, color, svg){

  	const svgns = "http://www.w3.org/2000/svg"; 
		let newCircle = document.createElementNS(svgns, "circle");

		newCircle.setAttribute("cx", cx); 
		newCircle.setAttribute("cy", cy);
		newCircle.setAttribute("r", radius);
		newCircle.setAttribute("fill", color);
		newCircle.setAttribute("opacity", .8.toString());
		newCircle.setAttribute("stroke", "gray");
		newCircle.setAttribute("stroke-width", 2.0.toString());

		// append the new line to the svg
		svg.appendChild(newCircle);
  }

  

