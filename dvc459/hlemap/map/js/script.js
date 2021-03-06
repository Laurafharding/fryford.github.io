﻿    // Copyright (c) 2013 Ryan Clark
    // https://gist.github.com/rclark/5779673

      L.TopoJSON = L.GeoJSON.extend({
      addData: function(jsonData) {
        if (jsonData.type === "Topology") {
          for (key in jsonData.objects) {
            geojson = topojson.feature(jsonData, jsonData.objects[key]);
            L.GeoJSON.prototype.addData.call(this, geojson);
          }
        }
        else {
          L.GeoJSON.prototype.addData.call(this, jsonData);
        }
      }
    });

  	//Set-up pym
	pymChild = new pym.Child();

	//Check whether inline svg is supported
	if(Modernizr.inlinesvg) {
	d3.select("#graphic").remove();
	dvc = {};


	first = true;
	selected=false;

	function ready (error, data, config){

	data2 = data;

	a = 0;

	chooseColor();

	function chooseColor(){

		if(config.ons.varcolour instanceof Array) {
			dvc.colour = config.ons.varcolour[a]
		} else {
			dvc.colour = eval("colorbrewer." + config.ons.varcolour);
		}

	}

  headings = d3.keys(data[0]).filter(function(key){  return key !="AREACD" && key !="AREANM" });
  // change "yr" to data[0] ! AREACD/NM
  dvc.time = "yr" + config.ons.chartLabels.length; // display last year
  //dvc.time = headings[headings.length-1];
  //console.log(headings, dvc.time);

	dvc.curr = config.ons.varload;

	dvc.loadvar = config.ons.datanames[a];
	dvc.unittext = config.ons.varunit[a];
	dvc.label = config.ons.varlabel[a];
	dvc.prefix = config.ons.varprefix[a];
	dvc.yAxisLabel = config.ons.yAxisLabel;
	
	config2 = config;

	if(config.ons.varlabel.length > 1)
		{navigation(config2,data);}
	else {d3.selectAll("#varsel").attr("class","hidden")};
	selectlist(config2,data);

	// Work out how many years we have in our dataset; number of rows - area name & code // Look at linechart templates to see how?
	    // parse data into columns
			var cols = -2; // set to -2 as that's the number of non-data columns AREANM, AREACD
		    var values = [],
				allvalues = [],
				averages = [];

		    for (var column in data[0]) {
				cols = cols + 1;
		        if (column != 'AREANM' && column != 'AREACD') {
		        values[column] =  data.map(function(d) {return +eval("d." + column); }).filter(function(d) {return !isNaN(d)}).sort(d3.ascending);

				                    averages.push(d3.mean(values[column]));
                    				allvalues = allvalues.concat(values[column]);
                    				}
		    }

	allvalues.sort(d3.ascending);
	//console.log("data:",averages, d3.min(allvalues), d3.max(allvalues) );

	//Create a flat array of all the values of earnings / filter out any non-numbers / sort in ascending order ready to pass to jenks algorithm

	if(config.ons.breaks[0] =="jenks")
		{	dvc.jenksSteps = 4;
			breaks = ss.jenks(allvalues, dvc.jenksSteps);
			console.log("jenk1: ", a,breaks, dvc.jenksSteps);
		}
	else {	breaks = config.ons.breaks[a];
			dvc.jenksSteps = config.ons.breaks[a].length - 1; };
	 //[69,75,80,85,90], [69,75,80,85,90], [13,16,19,22,25], [13,16,19,22,25]

	//Set-up and create an object variable to hold the data for the currently selected variable and the
	rateById = {};
	areaById = {};

	data.forEach(function(d) { rateById[d.AREACD] = +eval("d." + dvc.time);
                             areaById[d.AREACD] = d.AREANM
                            });


	var layerx = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',{
	  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB background</a> Contains OS data © Crown copyright 2016'
	});

		var map = L.map('map',{maxZoom:10,minZoom:3}),

		//Set-up new Topojson layer
		topoLayer = new L.TopoJSON();


		//Set-up colour scale
		color = d3.scale.threshold()
				.domain(breaks.slice(1,4))
				.range(dvc.colour);

		//Set initial centre view and zoom layer
		map.setView(eval(config.ons.centre), config.ons.zoom).addLayer(layerx)

		map.on("zoomstart", leaveLayer)
		map.on("zoomend", function(){setTimeout(function(){highlightArea()},50)})
		d3.select(".leaflet-top").style("top","70px");

	createKey(config);

			d3.select("#map").append("div").attr("id","time").text(config.ons.timelineLabelsDT[config.ons.timelineLabelsDT.length-1]);

			$.getJSON('map/data/geogeng.json').done(addTopoData);


function addTopoData(topoData){
			  topoLayer.addData(topoData);
			  topoLayer.eachLayer(handleLayer);
			  topoLayer.addTo(map);

			  d3.select(".leaflet-overlay-pane").selectAll("path").attr("stroke", "#ccc").attr("fill-opacity",0.8).attr("stroke-width",0.5);

			  dragging = d3.behavior.drag().on('dragstart', function () {
			  })

			  var xy = d3.select(".leaflet-overlay-pane").selectAll("path");
//console.log(xy);
			  xy.on("mouseout",leaveLayer).on("mouseover",enterLayer).call(dragging).on('click', click);

	}  // end funtion ready aka addTopoData



	function click(d) { //console.log('f click');

				  if (d3.event.defaultPrevented) return; // if dragged => go back

          grey = d3.select(this).style("fill")//.split('#')[0];

          // if colour = #ccc or class = E32... is not on UTLA list (or any list you wish) don't remove or highlightArea
          if(grey === 'rgb(245, 245, 245)' || grey === '#f5f5f5') {
                    d3.select(this).attr("pointer-events", "none")
                }else{
                     selectArea(this);
           				   highlightKey(this);
                  }
				}

			drawChart(dvc.curr);
			timeSlider();


    function handleLayer(layer){

		x = layer.feature.properties.AREACD;

		fillColor = color(rateById[x]);

        layer.setStyle({
		  fillColor: fillColor,
          fillOpacity: 0.8,
          color:'#f5f5f5',
          weight:0.8,
          opacity:0.3,
		  className: x
        });

    }

	function selectArea(xx) { console.log("ƒ selectArea");

				selected=true;
				myId = d3.select(xx).attr("class").split(' ')[0];
				currclass = d3.select(xx).attr("class").split(' ')[0];

				highlightArea();
				$("#occselect").val(currclass);
				$("#occselect").trigger("chosen:updated");

				d3.select(".leaflet-overlay-pane").selectAll("path")
												  .on("mouseout",null)
												  .on("mouseover",null);

				indexarea = document.getElementById("occselect").selectedIndex;

				pymChild.sendMessage('navigate', indexarea + " " + dvc.time);


	}



	function enterLayer(){
    grey = d3.select(this).style("fill")//.split('#')[0];
		currclass = d3.select(this).attr("class").split(' ')[0];
    //if(grey == '#f5f5f5') console.log('enterLayer col:',grey);
    // if colour = #ccc or class = E32... is not on UTLA list (or any list you wish) don't remove or highlightArea
       if(grey === 'rgb(245, 245, 245)' || grey === '#f5f5f5') {

              d3.select(this).attr("pointer-events", "none");
     }else{
          		d3.select('#selected').remove();
          		highlightArea();
              highlightKey(this);
        }
	}

    function highlightArea(){ // on rollover

		leaveLayer();

		var currpath = d3.select("." + currclass).attr("d");
		d3.select("#line1").attr("opacity",1);

		d3.select(".leaflet-overlay-pane").select("svg").append("path")
				.attr("d",currpath)
				.attr("id","selected")
				.attr("class", "arcSelection")
				.attr("pointer-events", "none")
				.attr("fill", "none")
				.attr("stroke", "#b4005a")
				.attr("stroke-width", "2");

				myCol = d3.select(".leaflet-overlay-pane");
		//console.log(currpath, myCol);

		/* Display name of area*/
		d3.select("#areanm").text(areaById[currclass]);


	format = d3.format(".1f")

	var subst = dvc.time.substr(2,3);

	var number = parseInt(subst)-1;

		d3.select("#areainfo").html(function(d,i){if (!isNaN(rateById[currclass]))  {return dvc.prefix + format(rateById[currclass]) + "<span>" + " "+dvc.yAxisLabel + "</span>"} else {return "Data unavailable"}});

		drawChart(currclass);

    }


function highlightKey(pill){
    shade1 = d3.select(pill).style("fill"); console.log(shade1.substr(0,3));
    if(shade1.substr(0,3) === 'rgb'){console.log("In rgb loop",shade1);
		   // shade = d3.select(pill).style("fill").split('#')[0];

				  var rgbToHex = function (rgb) {
												  var hex = Number(rgb).toString(16);
												  if (hex.length < 2) {
													   hex = "0" + hex;
												  }
											  return hex;
											};

						var fullColorHex = function(r,g,b) {
															  var red = rgbToHex(r);
															  var green = rgbToHex(g);
															  var blue = rgbToHex(b);
															  return red+green+blue;
															};
								rgbArray = shade1.split(',');
                //console.log(rgbArray);
								rgbArray.forEach(function(d,i) {
											rgbArray[i] = rgbArray[i].replace(/\D/g,"");
													});

								//console.log(fullColorHex(rgbArray[0],rgbArray[1],rgbArray[2]));
							dvc.scaleId = fullColorHex(rgbArray[0],rgbArray[1],rgbArray[2]);
							//console.log(dvc.scaleId);
							d3.select("#pill"+dvc.scaleId).style("stroke", "#b4005a").style("stroke-width", 2);
            } // ends if
            else{
              hex2 = shade1.split('#')[1]; //console.log("hex given:"+hex2);
              d3.select("#pill"+hex2).style("stroke", "#b4005a").style("stroke-width", 2);
            }
	}


	function leaveLayer(){

		d3.selectAll(".blocks").style("stroke", "#666").style("stroke-width", 1);
		d3.selectAll('#selected').remove();

		if(selected==false){
			d3.select("#areanm").text("");
			d3.select("#areainfo").text("");
			d3.select("#line1").transition().duration(500).attr("opacity",0);

			if(config.ons.circles == "true") {
				d3.select("#localcircles").selectAll("circle").transition().duration(500).attr("opacity",0);
			}

		}

    }



	function timeSlider() {

	//Make a slider so that the user can select the time period that they are interested in
//		d3.select("#mapPane").append("div").attr("id","sliderInc").append("div").attr("id","slider");
//		dvc.low = 1
//
//		$('#slider').labeledslider({min:0, max:4, values: dvc.low, tickInterval:1,  range: true, step:1, change:function(event,ui){
//
//			dvc.time = ui.values[0];
//
//		}});
//
//		labels = ['Mon', 'Tue', 'Wed', 'Thu'];
//
//		$('#slider').labeledslider( 'option', 'tickLabels', labels );


		$(window).resize(function(){$("#slide").slider('destroy'); initiateSlider()});

		d3.select("#timeSlider").append("div").attr("id","slide");

		initiateSlider();

				function initiateSlider(){

					var currVal = dvc.time.substr(2) - 1;


					if($(".container-fluid").width()<500){
								var timeLabels = config.ons.timelineLabelsMB;

							} else {
								var timeLabels = config.ons.timelineLabelsDT;

							}

					numticks = [];
					for(i=0; i < timeLabels.length; i++){
						numticks.push(i);
					}

					$("#slide").slider({
						value:currVal,//Set to whatever the last value was
						tooltip: 'hide',
						step: 1,
						ticks: numticks,
						ticks_labels: timeLabels,
						ticks_snap_bounds: 0
					});

					$("#slide").on("change", function(slideEvt) {

						dvc.time = "yr" + (slideEvt.value.newValue + 1);

						updateYear();
					});
				}

		d3.select(".footer").remove();

		//create link to source
			d3.select(".container-fluid").append("div").attr("class", "footer").append("p")
				.text("Source: ")
				.append("a")
				.attr("href", config.ons.sourceURL)
				.attr("target", "_blank")
				.html(config.ons.sourceLabel); // and change above url


		//setTimeout(function(){$("#slide").slider('setValue', 3)},5000);
			pymChild.sendHeight();
	}



	function drawChart(currid){

		//time = ["11","12","13","14","15","16"]; // replace with config

		if(first){
			first = false;
			second = true;


			//Start drawing chart
			//natvalues = config2.ons.average[a];
			natdata = d3.zip(config.ons.nonStdScale, averages);
			//console.log(natdata);

			var margin = {top: 180, right: 28, bottom: 10, left: 30};
			var chart_width = $("#chartPane").width() - margin.left - margin.right;


			var height = Math.ceil((chart_width * 3) / 4);

		    // clear out existing graphics
		    d3.select("#chartPane").select("svg").remove();
			//keypoints.empty();
//			footer.empty();

		    xchart = d3.time.scale()
		        .range([0, chart_width]);


		    ychart = d3.scale.linear()
		        .range([height, 0]);

		    xchart.domain([d3.time.format("%y").parse(config.ons.nonStdScale[0]), d3.time.format("%y").parse(config.ons.nonStdScale[config.ons.nonStdScale.length-1])] );

		    xAxis = d3.svg.axis()
		        .scale(xchart)
		        .orient("bottom")
		        .tickFormat(function(d,i) {
		           var fmt = d3.time.format("%y");
				   //console.log(fmt(d));
				   nxtyr = +fmt(d) +2;
		           //return '\u2019' + fmt(d);
				   if(i%2){
				   return fmt(d) + "/" + nxtyr;
				   }
		        })
				.tickPadding(5)
				.ticks(5);

	        //specify number of ticks on x axis and whether 1st and last data point labels are included
//	        if(graphic.width()<threshold_sm){
//	            xAxis.tickValues(x.ticks(dvc.optional.x_num_ticks_sm_md_lg[0]).concat( x.domain(5) ));
//	        } else if (graphic.width() <= threshold_md){
//				xAxis.tickValues(x.ticks(dvc.optional.x_num_ticks_sm_md_lg[1])/*.concat( x.domain() )*/);
//			} else {
//	            xAxis.tickValues(x.ticks(dvc.optional.x_num_ticks_sm_md_lg[2])/*.concat( x.domain() )*/);
//	        }



			//specify number or ticks on y axis
//			if (graphic.width() <= threshold_sm) {
//				yAxis.ticks(dvc.optional.y_num_ticks_sm_md_lg[0])
//			 } else if (graphic.width() <= threshold_md){
//				yAxis.ticks(dvc.optional.y_num_ticks_sm_md_lg[1])
//			 } else {
//				yAxis.ticks(dvc.optional.y_num_ticks_sm_md_lg[2])
//			 }

		    //gridlines
		    y_axis_grid = function() { return yAxis; }

			fmt = d3.time.format("%y");

			line2 = d3.svg.line()
				.defined(function(natdata) { return !isNaN(natdata[1]); })
		        .x(function(d,i) { return xchart(d3.time.format("%y").parse(natdata[i][0]))})
		        .y(function(d,i) { return ychart(natdata[i][1]); });



		  	//y domain calculations	: taking the maximum of all values

			maxVal = d3.max(allvalues);
			ceiling = Math.ceil(maxVal);
			minVal = 0;
			//axisDomain = config.ons.yAxisScale[a];
			//yDomain  [minVal,ceiling];
			yDomain = config.ons.yAxisScale[a];

				ychart.domain(yDomain);

		    yAxis = d3.svg.axis()
		        .scale(ychart)
		        .orient('left')
				    .ticks(6);

		    //create svg for chart
		    svg = d3.select('#chartPane').append('svg')
				        .attr("width", chart_width + margin.left + margin.right)
				        .attr("height", height + margin.top + margin.bottom +50)
				        .append("g")
				      //  .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
					  .attr("transform", "translate(30,180)");

					svg.append("text")
						.attr("id","ylabel")
						.attr("transform", "translate(-20,-12)")
						.text(/*capitalizeFirstLetter*/(dvc.unittext));

					svg.append("text")
						.attr("id","ylabel")
						.attr("x",xchart(d3.time.format("%y").parse(natdata[(cols-1)][0])) + 6)
						.attr("y",ychart(natdata[(cols-1)][1]) + 6)
						.text(config.ons.averagelabel);


					svg.append("rect")
						.attr("class","svgRect")
						.attr("width", chart_width)
						.attr("height", height)

				    svg.append('g')
				        .attr('class', 'y axis')
				        .call(yAxis);

				    svg.append('g')
				        .attr('class', 'y grid')
				        .call(y_axis_grid()
				            .tickSize(-chart_width, 0, 0)
				            .tickFormat('')
				        );

					//create x axis, if y axis doesn't start at 0 drop x axis accordingly
					svg.append('g')
				        .attr('class', 'x axis')
				        .attr('transform', function(d){
				        			if(yDomain[0] != 0){
										return 'translate(0,' + (height + 15) + ')'
									} else {
										return 'translate(0,' + height  + ')'
									}
							})
				        .call(xAxis);

				//create lines

				svg.append("path")
					.attr("id","line2")
					.attr("d", line2(natdata))
					.attr("fill","none")



			if(config.ons.circles == "true") {
				svg.append("g")
					.attr("id","natcircles")
					.selectAll("circle")
					.data(averages) // was natvalues
					.enter()
					.append("circle")
					.attr("opacity",1)
					.attr("fill","#fff")
					.attr("stroke-width",2)
					.attr("stroke","#666")
					.attr("cx",function(d,i){

					return xchart(d3.time.format("%y").parse(natdata[i][0]))

						})
					.attr("cy",function(d,i){

						if(isNaN(ychart(natdata[i][1]))){
							return 0
						} else {
							return ychart(natdata[i][1])
						}
					})
					.attr("r",function(d,i){if(isNaN(ychart(natdata[i][1])))
							{return 0}
							else {return 3}
					});

			}

		} // ends first time draw
		else if(second){ // for second time - chart already there

			second = false;
			namesall = d3.keys(data2[0]).filter(function(key) { return key !== "AREANM"; });
			currdata = data2.filter(function(d) {return d.AREACD == currid});
//console.log(currdata); // no data to zip if area rolled over is grey
//console.log(name);
			currdata.forEach(function(d) {
				  valuesx = namesall.map(function(name) { return +d[name]});
			});



			names = namesall.slice(1);

			values = valuesx.slice(1);
			linedata = d3.zip(config.ons.nonStdScale,values);
        //console.log(linedata);
			line1 = d3.svg.line()
				//.defined(function(linedata){ return linedata[1] != null;})
				.defined(function(linedata) { return !isNaN(linedata[1]); })
		        .x(function(d,i) { return xchart(d3.time.format("%y").parse(linedata[i][0]))})
		        .y(function(d,i) { return ychart(linedata[i][1]); });

		 	svg.append("path")
					.attr("id","line1")
					.attr("d", line1(linedata))
					.attr("fill","none");

			if(config.ons.circles == "true") {
				svg.append("g")
						.attr("id","localcircles")
						.selectAll("circle")
						.data(averages) // was natvalues
						.enter()
						.append("circle")
						.attr("opacity",1)
						.attr("fill","#fff")
						.attr("stroke-width",2)
						.attr("stroke","#008cba")
						.attr("cx",function(d,i){return xchart(d3.time.format("%y").parse(linedata[i][0]))})
						.attr("cy",function(d,i){if(isNaN(ychart(linedata[i][1])))
							{return 0}
							else {return ychart(linedata[i][1])}
						})
						.attr("r",function(d,i){if(isNaN(ychart(linedata[i][1])))
								{return 0}
								else {return 3}
						});

			}

		} else {
			namesall = d3.keys(data2[0]).filter(function(key) { return key !== "AREANM"; });

			currdata = data2.filter(function(d) {return d.AREACD ==currid});

			currdata.forEach(function(d) {
				  valuesx = namesall.map(function(name) { return +d[name]});
			});



			names = namesall.slice(1);

			values = valuesx.slice(1);

			linedata = d3.zip(config.ons.nonStdScale,values);

			svg.select("#line1").transition().duration(500).attr("d",line1(linedata));

			if(config.ons.circles == "true") {

				svg.select("#localcircles").selectAll("circle")
					.data(linedata)
					.transition()
					.duration(500)
					.attr("opacity",1)
					.attr("cx",function(d,i){return xchart(d3.time.format("%y").parse(linedata[i][0]))})
					.attr("cy",function(d,i){if(isNaN(ychart(linedata[i][1])))
							{return 0}
							else {return ychart(linedata[i][1])}
					})
					.attr("r",function(d,i){if(isNaN(ychart(linedata[i][1])))
							{return 0}
							else {return 3}
					});
			}

		}
	} // ends drawChart

	function createKey(config){

		keywidth = $("#keydiv").width();

		var svgkey = d3.select("#keydiv")
			.append("svg")
			.attr("id", "key")
			.attr("width",keywidth);

		newbreaks = breaks;

		var color = d3.scale.threshold()
		   .domain(newbreaks)
		   .range(dvc.colour);

		y = d3.scale.linear()
		    .domain([newbreaks[0], breaks[4]]) /*range for data*/
		    .range([300, 0]); /*range for pixels*/



		x = d3.scale.linear()
		    .domain([newbreaks[0], breaks[4]]) /*range for data*/
		    .range([0,keywidth-30]); /*range for pixels*/

		var xAxis = d3.svg.axis()
		    .scale(x)
		    .orient("bottom")
    		.tickSize(15)
		    .tickValues(color.domain())
			.tickFormat(d3.format(".1f"));


		var yAxis = d3.svg.axis()
		    .scale(y)
		    .orient("left")
    		.tickSize(15)
		    .tickValues(color.domain())
			.tickFormat(d3.format(".0f"));


		//horizontal key

		var g2 = svgkey.append("g").attr("id","horiz")
			.attr("transform", "translate(15,30)");


		keyhor = d3.select("#horiz");

		g2.selectAll("rect")
			.data(color.range().map(function(d,i) {

			  return {
				x0: i ? x(color.domain()[i+1]) : x.range()[0],
				x1: i < color.domain().length ? x(color.domain()[i+1]) : x.range()[1],
				z: d
			  };
			}))
		  .enter().append("rect")
		  	.attr("class", "blocks")
		  	.attr("id", function(d,i){ return "pill"+config.ons.varcolour[a][i].replace(/#/g,"");
										})
			.attr("height", 8)
			.attr("x", function(d) {
				 return d.x0; })
			.attr("width", function(d) {return d.x1 - d.x0; })
			.style("opacity",0.8)
			.style("fill", function(d) { return d.z; });


		keyhor.selectAll("rect")
			.data(color.range().map(function(d, i) {
			  return {
				x0: i ? x(color.domain()[i]) : x.range()[0],
				x1: i < color.domain().length ? x(color.domain()[i+1]) : x.range()[1],
				z: d
			  };
			}))
			.attr("x", function(d) { return d.x0; })
			.attr("width", function(d) { return d.x1 - d.x0; })
			.style("fill", function(d) { return d.z; });

		keyhor.call(xAxis).append("text")
			.attr("id", "caption")
			.attr("x", -63)
			.attr("y", -20)
			.text("");

		keyhor.append("rect")
			.attr("id","keybar")
			.attr("width",8)
			.attr("height",0)
			.attr("transform","translate(15,0)")
			.style("fill", "#ccc")
			.attr("x",x(0));



		d3.select("#horiz").selectAll("text").attr("transform",function(d,i){// if there are more that 4 breaks, so > 5 ticks, then drop every other.
																			if(i % 2 && dvc.jenksSteps > config.ons.dropXtick){return "translate(0,10)"
																			} });

		g2.append("text").attr("id","keyunit").text(dvc.unittext).attr("transform","translate(0,-10)");

	} // Ends create key



		function navigation(data, datacsv){

			$("#navigation").show();

		//Build pills

			dvc.varname = data.ons.varname;
			dvc.varunit = data.ons.varunit;


			a = dvc.varname.indexOf(dvc.curr);
			console.log("ƒ nav:"+a);
			dvc.unittext = dvc.varunit[a];
			dvc.label = data.ons.varlabel[a];
			dvc.prefix = data.ons.varprefix[a];

			var pills = d3.select("#pills")
					.append("ul")
					.attr("class","nav navbar nav-pills navbar-inverse nav-justified")
					.attr("data-toggle","pill")


			pills.selectAll("li")
				.data(data.ons.varlabel)
				.enter()
				.append("li")
				.attr("id", function(d,i){return data.ons.datanames[i]})
				.append("a")
				.attr("href","#")
				.attr("data-nm", function(d,i){return data.ons.varname[i]})
				.attr("data-toggle","pill")
				.text(function(d,i){return d;})
				.on("click", function(d,i){
					dvc.curr = d3.select(this).attr("data-nm");
					a = dvc.varname.indexOf(dvc.curr);
					loading = data.ons.datanames[a];

					updateMap(config2);
					dvc.unittext = dvc.varunit[a];
					dvc.label = data.ons.varlabel[a];
					d3.select("#keyunit").text(dvc.unittext);
					d3.select("#areainfo");
					d3.select("#areanm").text("");
					d3.select("#areainfo").text("");
					$("#occselect").val('').trigger("chosen:updated");
					d3.select('#selected').remove();

				});


			d3.select("#" + dvc.loadvar).attr("class","active");

			 var highest = null;

			   $(".nav-pills a").each(function(){  //find the height of your highest link due to wordwrap
				   var h = $(this).height();
				   if(h > highest){
					  highest = $(this).height();
				   }
				});

			   $(".nav-pills a").height(highest);  //set all your links to that height.

			d3.select("#varsel").html(dvc.label + " <span class='caret'></span>");

			dropnext = d3.select("#menu").append("ul")
					.attr("class","dropdown-menu")
					.attr("role","menu");

			dropnext.selectAll("li")
					.data(data.ons.varlabel)
					.enter()
					.append("li")
					.attr("id", function(d,i){return "drop" + data.ons.datanames[i]})
					.append("a")
					.attr("href","#")
					.attr("data-nm", function(d,i){return data.ons.varname[i]})
					.text(function(d,i){return d;})
					.on("click", function(d,i){
            						dvc.curr = d3.select(this).attr("data-nm");
            						a = dvc.varname.indexOf(dvc.curr);
            						loading = data.ons.datanames[a];
            						updateMap(config2);
            						dvc.unittext = dvc.varunit[a];
            						d3.select("#varsel").html(data.ons.varlabel[i] + " <span class='caret'></span>");
            						dvc.label = data.ons.varlabel[a];
            						d3.select("#keyunit").text(dvc.unittext);
            						dropnext.selectAll("li").attr("class","")
            						d3.select("#drop" + dvc.curr).attr("class","active");
            						d3.select("#areanm").text("");
            						d3.select("#areainfo").text("");
            						$("#occselect").val('').trigger("chosen:updated");
            						d3.select('#selected').remove();
					});

			d3.select("#drop" + dvc.curr).attr("class","active");

	}

	function selectlist(data, datacsv) {

			var areacodes =  datacsv.map(function(d) { return d.AREACD; });
			var areanames =  datacsv.map(function(d) { return d.AREANM; });
			var menuarea = d3.zip(areanames,areacodes).sort(function(a, b){ return d3.ascending(a[0], b[0]); });

			// Build option menu for occupations
			var optns = d3.select("#chosensel").append("div").attr("id","sel").append("select")
				.attr("id","occselect")
				.attr("style","width:98%")
				.attr("class","chosen-select");


			optns.append("option")
				.attr("value","first")
				.text("");

			optns.selectAll("p").data(menuarea).enter().append("option")
				.attr("value", function(d){ return d[1]})
				.text(function(d){ return d[0]});

			myId=null;

			$('#occselect').chosen({width: "98%", allow_single_deselect:true}).on('change',function(evt,params){

								if(typeof params != 'undefined') {


										/* identify the data-nm attribute of the polygon you've hovered over */
										indexarea = document.getElementById("occselect").selectedIndex;
										myId=params.selected;
										currclass=params.selected;

										selected=true;
										leaveLayer();
										highlightArea();


										d3.select(".leaflet-overlay-pane").selectAll("path").on("mouseout",null).on("mouseover",null);
  										pymChild.sendMessage('navigate', indexarea + " " + dvc.time);

								}
								else {
										// Remove any selections
										indexarea ="0";
										myId=null;
										selected=false;
										leaveLayer();
										d3.select(".leaflet-overlay-pane").selectAll("path").on("mouseout",leaveLayer).on("mouseover",enterLayer);
										pymChild.sendMessage('navigate', indexarea + " " + dvc.time);

								}

			});

	};
	playTime();

	function playTime() {
		var currentState = "play";



		d3.select("#playPause").on("click", function(){
		d3.select("#playPause").html("<span class='glyphicon glyphicon-pause' aria-hidden='true'></span> Pause");
		if(currentState == "play") {
		currentState = "pause";

			 playInt = setInterval(function(){
				currTime = $("#slide").slider('getValue');
				if(currTime<(cols-1)) {
					currTime =  currTime + 1;
				} else {
					currTime =  0;
				};

				dvc.time = "yr" + (currTime+1);
				$("#slide").slider('setValue', currTime)
				updateYear();
				},2000);

		} else {
			currentState = "play";
			d3.select("#playPause").html("<span class='glyphicon glyphicon-play' aria-hidden='true'></span> Play");
		  	clearInterval(playInt);
		}
		});


	}

	function updateYear(){

	indexarea = document.getElementById("occselect").selectedIndex;
	console.log("area index:"+indexarea);
	pymChild.sendMessage('navigate', indexarea + " " + dvc.time);
		// Create an object to give yourself a pair of values for the parlicon code and data value

		rateById = {};

		data2.forEach(function(d) { rateById[d.AREACD] = +eval("d." + dvc.time);});

		topoLayer.eachLayer(handleLayer);

		var xy = d3.select(".leaflet-overlay-pane").selectAll("path");

		xy.on("mouseout",leaveLayer).on("mouseover",enterLayer).call(dragging).on('click', click);


		currDate = dvc.time.slice(2);

		d3.select("#time").text(config.ons.timelineLabelsDT[currDate-1]);//numbadd+"/"+numb);

		format=d3.format(".3n")

		if(myId != null) {
			highlightArea();
			d3.select(".leaflet-overlay-pane").selectAll("path").on("mouseout",null).on("mouseover",null);
			d3.select("#areainfo").html(function(d,i){if (!isNaN(rateById[currclass]))  {return dvc.prefix + format(rateById[currclass]) + "<span>" +" "+ dvc.yAxisLabel + "</span>"} else {return "Data unavailable"}});
		}

		d3.select(".leaflet-overlay-pane").selectAll("path").attr("stroke", "#ccc").attr("fill-opacity",0.8).attr("stroke-width",0.5);


	}


	function updateMap(config){
		loadingPath = "map/data/" + loading + ".csv";

		//First load the new csv file
		d3.csv(loadingPath, function(error, data) {
				data2 = data;

				// Work out how many years we have in our dataset; number of rows - area name & code // Look at linechart templates to see how?
				// parse data into columns
					var cols = -2; // set to -2 as that's the number of non-data columns
					var values = []
						allvalues = [],
						averages = [];

					for (var column in data[0]) {
						cols = cols + 1;
						if (column != 'AREANM' && column != 'AREACD') {
						values[column] =  data.map(function(d) { return +eval("d." + column); }).filter(function(d) {return !isNaN(d)}).sort(d3.ascending);

						averages.push(d3.mean(values[column]));

						allvalues = allvalues.concat(values[column]);
						}
					}
			//console.log("data:",averages, d3.min(allvalues), d3.max(allvalues) );

			allvalues.sort(d3.ascending);

			if(config.ons.breaks[a] =="jenks"){
				breaks = ss.jenks(allvalues, 4);
				console.log(breaks);
			} else {
				breaks = config.ons.breaks[a];
			};
			console.log("jenk2: ", a,breaks, dvc.jenksSteps);

			//Set-up and create an object variable to hold the data for the currently selected variable and the year
			rateById = {};
			areaById = {};

			data.forEach(function(d) { rateById[d.AREACD] = +eval("d." + dvc.time); areaById[d.AREACD] = d.AREANM});

			chooseColor();

			color = d3.scale.threshold()
				.domain(breaks.slice(1,4))
				.range(dvc.colour);

			d3.select("#keydiv").select("svg").remove();
		    d3.select("#chartPane").select("svg").remove();


			createKey(config);
			first=true;
			drawChart(dvc.curr);

			topoLayer.eachLayer(handleLayer);
				var xy = d3.select(".leaflet-overlay-pane").selectAll("path");

				xy.on("mouseout",leaveLayer).on("mouseover",enterLayer).call(dragging).on('click', click);

			d3.select(".leaflet-overlay-pane").selectAll("path").attr("stroke", "#ccc").attr("fill-opacity",0.8).attr("stroke-width",0.5);
		  });



    }; // ends update map
	}// End function ready





	//Load data and config file
	queue()
		.defer(d3.csv, "map/data/hlem0.csv")
		.defer(d3.json, "map/data/config.json")
		.await(ready);

		var loading="mortality";



	} else {  // if not Modernizr.inlinesvg
		d3.select("#graphic").html("Sorry your browser does not support this interactive graphic");
		d3.select("#graphic")
			.append("img")
			.attr("src","./images/altlife.png")
			.attr("width","100%")
			.attr("height","100%");

		pymChild.sendHeight();
	}
