
//test if browser supports webGL

if(Modernizr.webgl) {
	
	//setup pymjs
	var pymChild = new pym.Child();
	
	//Load data and config file
	d3.queue()
		.defer(d3.csv, "data/chnglem.csv")
		.defer(d3.json, "data/config.json")
		.defer(d3.json, "data/geog.json")
		.await(ready);
		
	
	function ready (error, data, config, geog){
		
		//Set up global variables	
		dvc = config.ons;
		oldAREACD = "";
		
		//set title of page
		//Need to test that this shows up in GA
		document.title = dvc.maptitle;
		
		//Fire design functions
		selectlist(data);
		
		//Set up number formats
		displayformat = d3.format("." + dvc.displaydecimals + "f");
		legendformat = d3.format("." + dvc.legenddecimals + "f");

		//set up basemap
		map = new mapboxgl.Map({
		  container: 'map', // container id
		  style: 'https://free.tilehosting.com/styles/positron/style.json?key=ZBXiR1SHvcgszCLwyOFe', //stylesheet location
		  center: [-2.5, 54], // starting position
		  zoom: 4.5, // starting zoom
		  maxZoom: 13, //
		  attributionControl: false
		});
		//add fullscreen option
		map.addControl(new mapboxgl.FullscreenControl());
		
		// Add zoom and rotation controls to the map.
		map.addControl(new mapboxgl.NavigationControl());
		
		// Disable map rotation using right click + drag
		map.dragRotate.disable();
		
		// Disable map rotation using touch rotation gesture
		map.touchZoomRotate.disableRotation();
		
		
		// Add geolocation controls to the map.
		map.addControl(new mapboxgl.GeolocateControl({
			positionOptions: {
				enableHighAccuracy: true
			}
		}));
		
		//add compact attribution
		map.addControl(new mapboxgl.AttributionControl({
			compact: true
		}));
		

		
		addFullscreen();
		
		//set up d3 color scales
				
		rateById = {};
		areaById = {};

		data.forEach(function(d) { rateById[d.AREACD] = +eval("d." + dvc.varname); areaById[d.AREACD] = d.AREANM});	
		
		
		//Flatten data values and work out breaks
		var values =  data.map(function(d) { return +eval("d." + dvc.varname); }).filter(function(d) {return !isNaN(d)}).sort(d3.ascending);
		
		if(config.ons.breaks =="jenks") {
			breaks = [];
			
			ss.ckmeans(values, (dvc.numberBreaks)).map(function(cluster,i) {
				if(i<dvc.numberBreaks-1) {
					breaks.push(cluster[0]);
				} else {
					breaks.push(cluster[0])
					//if the last cluster take the last max value
					breaks.push(cluster[cluster.length-1]);
				}
			});
		}
		else if (config.ons.breaks == "equal") {
			breaks = ss.equalIntervalBreaks(values, dvc.numberBreaks);
		}
		else {breaks = config.ons.breaks;};
		
		breaks = breaks.map(function(each_element){
			return Number(each_element.toFixed(dvc.legenddecimals));
		});
		
		if(typeof dvc.varcolour === 'string') {
			colour = colorbrewer[dvc.varcolour][dvc.numberBreaks];
		} else {
			colour = dvc.varcolour;
		}
		
		//set up d3 color scales
		color = d3.scaleThreshold()
				.domain(breaks.slice(1))
				.range(colour);
		
		//now ranges are set we can call draw the key
		createKey(config);
		
		//convert topojson to geojson
		for(key in geog.objects){
			var areas = topojson.feature(geog, geog.objects[key])
		}
		
		bounds = turf.extent(areas);
		
		setTimeout(function(){
			map.fitBounds([[bounds[0],bounds[1]], [bounds[2], bounds[3]]])
		},100);
		
		//and add properties to the geojson based on the csv file we've read in
		areas.features.map(function(d,i) {
			
		  d.properties.fill = color(rateById[d.properties.AREACD]) 
		});

		
		map.on('load', function() {
		  
			map.addSource('area', { 'type': 'geojson', 'data': areas });
		
			  map.addLayer({
				  'id': 'area',
				  'type': 'fill',
				  'source': 'area',
				  'layout': {},
				  'paint': {
					  'fill-color': {
							type: 'identity',
							property: 'fill',
					   },
					  'fill-opacity': 0.7,
					  'fill-outline-color': '#fff'
				  }
			  });
			
			//Get current year for copyright
			today = new Date();
			copyYear = today.getFullYear();
			map.style.sourceCaches['area']._source.attribution = "Contains OS data &copy; Crown copyright and database right " + copyYear;
			
			map.addLayer({
				"id": "state-fills-hover",
				"type": "line",
				"source": "area",
				"layout": {},
				"paint": {
					"line-color": "#000",
					"line-width": 2
				},
				"filter": ["==", "AREACD", ""]
			});
					
			  map.addLayer({
				  'id': 'area_labels',
				  'type': 'symbol',
				  'source': 'area',
				  'minzoom': 10,
				  'layout': {
					  "text-field": '{AREANM}',
					  "text-font": ["Open Sans","Arial Unicode MS Regular"],
					  "text-size": 14
				  },
				  'paint': {
					  "text-color": "#666",
					  "text-halo-color": "#fff",
					  "text-halo-width": 1,
					  "text-halo-blur": 1
				  }
			  });
			  
			 
			//test whether ie11 or not
			if(!!window.MSInputMethodContext && !!document.documentMode == true){
				isIE = true;
				onMove = onMove.debounce(50);
				onLeave = onLeave.debounce(50);
			} else {
				isIE = false;
			}
			
			if(isIE) {
				//Highlight stroke on mouseover (and show area information)
				map.on("mousemove", "area", onMove);
	
				// Reset the state-fills-hover layer's filter when the mouse leaves the layer.
				map.on("mouseleave", "area", onLeave);
			} else {
				//Highlight stroke on mouseover (and show area information)
				map.on("mousemove", "area", onMove);
	
				// Reset the state-fills-hover layer's filter when the mouse leaves the layer.
				map.on("mouseleave", "area", onLeave);	
			};
			
			//Add click event
			map.on("click", "area", onClick);
			
			//get location on click
			d3.select(".mapboxgl-ctrl-geolocate").on("click",geolocate);
	
		});
		
		function onMove(e) {
				newAREACD = e.features[0].properties.AREACD;
				
				if(newAREACD != oldAREACD) {
					oldAREACD = e.features[0].properties.AREACD;
					map.setFilter("state-fills-hover", ["==", "AREACD", e.features[0].properties.AREACD]);
					
					selectArea(e.features[0].properties.AREACD);
					setAxisVal(e.features[0].properties.AREACD);
				}
		};
		
					
		function onLeave() {
				map.setFilter("state-fills-hover", ["==", "AREACD", ""]);
				oldAREACD = "";
				$("#areaselect").val("").trigger("chosen:updated");
				hideaxisVal();
		};
			
		function onClick(e) {
				disableMouseEvents();
				newAREACD = e.features[0].properties.AREACD;
				
				if(newAREACD != oldAREACD) {
					oldAREACD = e.features[0].properties.AREACD;
					map.setFilter("state-fills-hover", ["==", "AREACD", e.features[0].properties.AREACD]);
					
					selectArea(e.features[0].properties.AREACD);
					setAxisVal(e.features[0].properties.AREACD);
				}
		};	
	
		function disableMouseEvents() {
			if(isIE){
				map.off("mousemove", "area", onMove);
				map.off("mouseleave", "area", onLeave);
				console.log("disabledIEn");	
			} else {
				map.off("mousemove", "area", onMove);
				map.off("mouseleave", "area", onLeave);	
			}
			
		}
		
		function enableMouseEvents() {
				map.on("mousemove", "area", onMove);
				map.on("click", "area", onClick);
				map.on("mouseleave", "area", onLeave);	
		}
		
		function selectArea(code) {
			$("#areaselect").val(code).trigger("chosen:updated");
		}
		
		function zoomToArea(code) {
			
			specificpolygon = areas.features.filter(function(d) {return d.properties.AREACD == code})
		
			specific = turf.extent(specificpolygon[0].geometry);
			
			map.fitBounds([[specific[0],specific[1]], [specific[2], specific[3]]], {
  				padding: {top: 150, bottom:150, left: 100, right: 100}
			});
				
		}
		
		function resetZoom() {
			
			map.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]]);
				
		}
		
		
		function setAxisVal(code) {
			d3.select("#currLine")
				.style("opacity",1)
				.transition()
				.duration(400)
				.attr("x1", x(rateById[code]))
				.attr("x2", x(rateById[code]));
				
				
			d3.select("#currVal").text(displayformat(rateById[code]))
				.style("opacity",1)
				.transition()
				.duration(400)
				.attr("x", x(rateById[code]));
				
		}
		
		function hideaxisVal() {
			d3.select("#currLine")
				.style("opacity",0)
				
			d3.select("#currVal").text("")
				.style("opacity",0)
		}
		
		function createKey(config){

			keywidth = d3.select("#keydiv").node().getBoundingClientRect().width;
			
			var svgkey = d3.select("#keydiv")
				.append("svg")
				.attr("id", "key")
				.attr("width", keywidth)
				.attr("height",65);
		
	
			var color = d3.scaleThreshold()
			   .domain(breaks)
			   .range(colour);
	
			// Set up scales for legend
			x = d3.scaleLinear()
				.domain([breaks[0], breaks[dvc.numberBreaks]]) /*range for data*/
				.range([0,keywidth-30]); /*range for pixels*/
	
	
			var xAxis = d3.axisBottom(x)
				.tickSize(15)
				.tickValues(color.domain())
				.tickFormat(legendformat);
	
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
				.attr("height", 8)
				.attr("x", function(d) {
					 return d.x0; })
				.attr("width", function(d) {return d.x1 - d.x0; })
				.style("opacity",0.8)
				.style("fill", function(d) { return d.z; });
	
	
			g2.append("line")
				.attr("id", "currLine")
				.attr("x1", x(10))
				.attr("x2", x(10))
				.attr("y1", -10)
				.attr("y2", 8)
				.attr("stroke-width","2px")
				.attr("stroke","#000")
				.attr("opacity",0);
				
			g2.append("text")
				.attr("id", "currVal")
				.attr("x", x(10))
				.attr("y", -15)
				.attr("fill","#000")
				.text("");
			
				
	
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
	
	
			if(dvc.dropticks) {
				d3.select("#horiz").selectAll("text").attr("transform",function(d,i){
						// if there are more that 4 breaks, so > 5 ticks, then drop every other.
						if(i % 2){return "translate(0,10)"} }
				);
			}
			//Temporary	hardcode unit text																
			dvc.unittext = "change in life expectancy";
			
			d3.select("#keydiv").append("p").attr("id","keyunit").style("margin-top","-10px").style("margin-left","10px").text(dvc.varunit);

	} // Ends create key
	
	function addFullscreen() {
		
		currentBody = d3.select("#map").style("height");
		d3.select(".mapboxgl-ctrl-fullscreen").on("click", setbodyheight)	
		
	}
	
	function setbodyheight() {
		d3.select("#map").style("height","100%");
		
		setTimeout(function(){d3.select(".mapboxgl-ctrl-shrink").on("click", shrinkbody)},1000);
		
	}
	
	function shrinkbody() {
		d3.select("#map").style("height",currentBody);
		pymChild.sendHeight(); 
	}
	
	function geolocate() {
		
		var options = {
		  enableHighAccuracy: true,
		  timeout: 5000,
		  maximumAge: 0
		};
		
		navigator.geolocation.getCurrentPosition(success, error, options);	
	}
	
	function success(pos) {
	  crd = pos.coords;
	  
	  //go on to filter
	  //Translate lng lat coords to point on screen
	  point = map.project([crd.longitude,crd.latitude]);
	  
	  //then check what features are underneath
	  var features = map.queryRenderedFeatures(point);
	  
	  //then select area
	  disableMouseEvents();
							
	  map.setFilter("state-fills-hover", ["==", "AREACD", features[0].properties.AREACD]);
	
	  selectArea(features[0].properties.AREACD);
	  setAxisVal(features[0].properties.AREACD);
	  
	  
	};
		
		function selectlist(datacsv) {

			var areacodes =  datacsv.map(function(d) { return d.AREACD; });
			var areanames =  datacsv.map(function(d) { return d.AREANM; });
			var menuarea = d3.zip(areanames,areacodes).sort(function(a, b){ return d3.ascending(a[0], b[0]); });

			// Build option menu for occupations
			var optns = d3.select("#selectNav").append("div").attr("id","sel").append("select")
				.attr("id","areaselect")
				.attr("style","width:98%")
				.attr("class","chosen-select");


			optns.append("option")
				.attr("value","first")
				.text("");

			optns.selectAll("p").data(menuarea).enter().append("option")
				.attr("value", function(d){ return d[1]})
				.text(function(d){ return d[0]});

			myId=null;

			$('#areaselect').chosen({width: "98%", allow_single_deselect:true}).on('change',function(evt,params){

					if(typeof params != 'undefined') {

							disableMouseEvents();
							
							map.setFilter("state-fills-hover", ["==", "AREACD", params.selected]);
					
							selectArea(params.selected);
							setAxisVal(params.selected);
							
							zoomToArea(params.selected);
							
					}
					else {
							enableMouseEvents();
							hideaxisVal();
							onLeave();
							resetZoom();
					}

			});

	};
		
	}

} else {
	
	//provide fallback for browsers that don't support webGL
	d3.select('#map').remove();
	d3.select('body').append('p').html("Unfortunately your browser does not support WebGL. <a href='https://www.gov.uk/help/browsers' target='_blank>'>If you're able to please upgrade to a modern browser</a>")	

}