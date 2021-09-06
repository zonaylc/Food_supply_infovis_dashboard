import { yearLabels, data, blurUntilCompletion } from "./main.js";
import { getRecords, ITEM_GROUP_CODES_LEVEL0, ITEM_GROUP_COLORS_LEVEL0 } from "./singleBar.js";

// svg
var svgContainer = d3.select("#streamgraph-container");

var margin = { top: 20, right: 30, bottom: 0, left: 10 };
var width = +svgContainer.node().getBoundingClientRect().width; //- margin.left - margin.right;
var height = +svgContainer.node().getBoundingClientRect().height - margin.top - margin.bottom;

var svg = svgContainer
  .append("svg")
  .attr("width", width) //+ margin.left + margin.right
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform",
    "translate(" + margin.left + "," + margin.top + ")");


export async function updateStream(elementCode, countryIds, blurOnLoad = true) {
  d3.selectAll(".myArea").remove();

  // get data
  var recordsLevel0 = [];
  var parser = d3.timeParse("%Y");

  await blurUntilCompletion(blurOnLoad ? [svgContainer] : [], () => {
    recordsLevel0 = getRecords(ITEM_GROUP_CODES_LEVEL0, elementCode, countryIds)
  })
  console.log(recordsLevel0);
  // ugly code that makes sure that everything works as before :(
  // TODO change everything below this line to build the streamgraph from just two records (animal+vegetal prod.) in the form:
  // [AreaCode, Area, ItemCode, Item, ElementCode, Element, Y1961, Y1962, ..., Y2017]
  // currently the algorithm expects records in the form (for each year):
  // [AreaCode, Area, ItemCode, Item, ElementCode, Element, Year, Value]
  // this ugly code transforms the recordsLevel0 from the first form to the second form
  var temp = [];
  yearLabels.forEach(yearLabel => {
    recordsLevel0.forEach(fullRecord => {
      var clone = JSON.parse(JSON.stringify(fullRecord));
      clone["Year"] = +yearLabel.substring(1);
      clone["Value"] = clone[yearLabel];
      temp.push(clone);
    });
  });
  recordsLevel0 = temp;

  //make the data group
  var nest = d3.nest()
    .key(function (d) { return d.Year; })
    .entries(recordsLevel0)

  //build the format for stack      
  var results = nest.map(function (d) {
    var item = {}
    d.values.forEach(function (e) {
      item[e['Item']] = e['Value']
    });

    item.Year = parser(d.key);
    return item;
  })

  //set the keys
  var keys = d3.set(recordsLevel0.map(function (d) { return d['Item']; })).values();

  // stack the data
  var layers = d3.stack()
    .offset(d3.stackOffsetSilhouette)
    .keys(keys)
    (results)

  //scales
  // X axis
  var x = d3.scaleTime()
    //.domain([1961, 2017])
    .domain(d3.extent(results, function (d) { return d.Year }))
    .range([0, width]);

  // Y axis
  var y = d3.scaleLinear()
    .domain([d3.min(layers, stackMin), d3.max(layers, stackMax)])
    .range([height, 0]);

  function stackMax(layer) {
    return d3.max(layer, function (d) { return d[1]; });
  }

  function stackMin(layer) {
    return d3.min(layer, function (d) { return d[0]; });
  }

  // Add x-axis
  svg.append("g")
    //.attr("transform", "translate(0," + height*0.7 + ")")
    .call(d3.axisTop(x).tickSize(-height * .7))
  //.select(".domain").remove()

  // Customization
  svg.selectAll(".tick line").attr("stroke", "#b8b8b8")



  // color palette
  var color = d3.scaleOrdinal()
    .domain(keys)
    .range(ITEM_GROUP_COLORS_LEVEL0);

  // create a tooltip
  var Tooltip = svg
    .append("text")
    .attr("x", 0)
    .attr("y", 0)
    .style("opacity", 0)
    .style("font-size", 17)


  // Three function that change the tooltip when user hover / move / leave a cell
  var mouseover = function (d) {
    Tooltip.style("opacity", 1)
    d3.selectAll(".myArea").style("opacity", .2)
    d3.select(this)
      .style("stroke", "black")
      .style("opacity", 1)
  }
  var mousemove = function (d, i) {
    var grp = keys[i]
    Tooltip.text(grp)
  }
  var mouseleave = function (d) {
    Tooltip.style("opacity", 0)
    d3.selectAll(".myArea").style("opacity", 1).style("stroke", "none")
  }

  // Area generator
  var area = d3.area()
    .defined(d => !isNaN(d[1]) & d[0] != -0)
    .x(function (d) { return x(d.data.Year); })
    .y0(function (d) { return y(d[0]); })
    .y1(function (d) { return y(d[1]); });


  // Show the areas
  svg
    .selectAll("myLayer")
    .data(layers)
    .enter()
    .append("path")
    .attr("class", "myArea")
    .style("fill", function (d) { return color(d.key); })
    .attr("d", area)
    .on("mouseover", mouseover)
    .on("mousemove", mousemove)
    .on("mouseleave", mouseleave)


    
    

}



