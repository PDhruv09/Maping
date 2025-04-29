// Import Mapbox and D3 as ESM modules
import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Check that Mapbox GL JS is loaded
console.log("Mapbox GL JS Loaded:", mapboxgl);

// Set your Mapbox access token
mapboxgl.accessToken = 'pk.eyJ1IjoicGRocnV2LTA5IiwiYSI6ImNtN2t6djRqcDAyeWkybnB2Z3ZnMHFjajgifQ.Eq2u_G3zeC9g_T9MPQE0fA';

// Initialize the map
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/pdhruv-09/cm7l54j16003s01ss1a55ejii',
  center: [-71.09415, 42.36027],
  zoom: 12,
  minZoom: 5,
  maxZoom: 18
});

// Helper functions
function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function formatTime(minutes) {
  const date = new Date(0, 0, 0, 0, minutes);
  return date.toLocaleString('en-US', { timeStyle: 'short' });
}

function getCoords(station) {
  const point = new mapboxgl.LngLat(+station.lon, +station.lat);
  const { x, y } = map.project(point);
  return { cx: x, cy: y };
}

// Global variables
let departuresByMinute = Array.from({ length: 1440 }, () => []);
let arrivalsByMinute = Array.from({ length: 1440 }, () => []);
let stations = [];
let svg, circles;
let radiusScale, stationFlow;
let timeFilter = -1;

// Function to prefilter trips
function filterByMinute(tripsByMinute, minute) {
  if (minute === -1) return tripsByMinute.flat();
  let minMinute = (minute - 60 + 1440) % 1440;
  let maxMinute = (minute + 60) % 1440;
  if (minMinute > maxMinute) {
    return tripsByMinute.slice(minMinute).concat(tripsByMinute.slice(0, maxMinute)).flat();
  } else {
    return tripsByMinute.slice(minMinute, maxMinute).flat();
  }
}

// Function to compute station traffic
function computeStationTraffic(stations, timeFilter = -1) {
  const departures = d3.rollup(
    filterByMinute(departuresByMinute, timeFilter),
    v => v.length,
    d => d.start_station_id
  );
  const arrivals = d3.rollup(
    filterByMinute(arrivalsByMinute, timeFilter),
    v => v.length,
    d => d.end_station_id
  );

  return stations.map(station => {
    let id = station.short_name;
    station.arrivals = arrivals.get(id) ?? 0;
    station.departures = departures.get(id) ?? 0;
    station.totalTraffic = station.arrivals + station.departures;
    return station;
  });
}

// Function to update scatterplot
function updateScatterPlot(timeFilter) {
  const updatedStations = computeStationTraffic(stations, timeFilter);

  if (timeFilter === -1) {
    radiusScale.range([0, 25]);
  } else {
    radiusScale.range([3, 50]);
  }

  circles = svg.selectAll('circle')
    .data(updatedStations, d => d.short_name)
    .join('circle')
    .attr('r', d => radiusScale(d.totalTraffic))
    .attr('stroke', 'white')
    .attr('stroke-width', 1)
    .attr('opacity', 0.6)
    .style('pointer-events', 'auto')
    .style('--departure-ratio', d => stationFlow(d.departures / d.totalTraffic))
    .each(function(d) {
      d3.select(this).selectAll('title').remove();
      d3.select(this).append('title')
        .text(`${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
    });

  updatePositions();
}

// Function to update time display
function updateTimeDisplay() {
  const timeSlider = document.getElementById('time-slider');
  const selectedTime = document.getElementById('selected-time');
  const anyTimeLabel = document.getElementById('any-time');

  timeFilter = Number(timeSlider.value);

  if (timeFilter === -1) {
    selectedTime.textContent = '';
    anyTimeLabel.style.display = 'block';
  } else {
    selectedTime.textContent = formatTime(timeFilter);
    anyTimeLabel.style.display = 'none';
  }

  updateScatterPlot(timeFilter);
}

// Function to update circle positions
function updatePositions() {
  circles.attr('cx', d => getCoords(d).cx)
         .attr('cy', d => getCoords(d).cy);
}

// Create traffic legend dynamically
function createLegend() {
    const legend = d3.select('body').append('div')
      .attr('class', 'legend')
      .style('position', 'absolute')
      .style('bottom', '80px')
      .style('left', '50%')
      .style('transform', 'translateX(-50%)')
      .style('background', 'rgba(0,0,0,0.7)')
      .style('padding', '10px')
      .style('border-radius', '5px')
      .style('color', 'white')
      .style('display', 'flex')
      .style('gap', '15px');
  
    legend.append('div').html('<span style="display:inline-block;width:12px;height:12px;background:steelblue;margin-right:5px;"></span> More Departures');
    legend.append('div').html('<span style="display:inline-block;width:12px;height:12px;background:purple;margin-right:5px;"></span> Balanced');
    legend.append('div').html('<span style="display:inline-block;width:12px;height:12px;background:darkorange;margin-right:5px;"></span> More Arrivals');
}

// Map load event
map.on('load', async () => {
    // Add bike lane layers
    map.addSource('boston-bike', {
        type: 'geojson',
        data: 'assets/JSON/Existing_Bike_Network_2022.geojson'
    });
    map.addLayer({
        id: 'boston-bike-lanes',
        type: 'line',
        source: 'boston-bike',
        paint: {
        'line-color': 'green',
        'line-width': 3,
        'line-opacity': 0.4
        }
    });

    map.addSource('cambridge-bike', {
        type: 'geojson',
        data: 'assets/JSON/Existing_Bike_Network_Cambridge.geojson'
    });
    map.addLayer({
        id: 'cambridge-bike-lanes',
        type: 'line',
        source: 'cambridge-bike',
        paint: {
        'line-color': 'green',
        'line-width': 3,
        'line-opacity': 0.4
        }
    });

    // Create SVG overlay
    svg = d3.select('#map').select('svg')
        .style('position', 'absolute')
        .style('z-index', 1)
        .style('width', '100%')
        .style('height', '100%')
        .style('pointer-events', 'none');

    // Load station data
    const stationData = await d3.json('assets/JSON/bluebikes-stations.json');
    stations = stationData.data.stations;

    // Load trip data
    await d3.csv('assets/csv/bluebikes-traffic-2024-03.csv', (trip) => {
        trip.started_at = new Date(trip.started_at);
        trip.ended_at = new Date(trip.ended_at);
        let startMin = minutesSinceMidnight(trip.started_at);
        let endMin = minutesSinceMidnight(trip.ended_at);
        departuresByMinute[startMin].push(trip);
        arrivalsByMinute[endMin].push(trip);
        return trip;
    });

    // Initialize scales
    stations = computeStationTraffic(stations);
    radiusScale = d3.scaleSqrt()
        .domain([0, d3.max(stations, d => d.totalTraffic)])
        .range([0, 25]);
    stationFlow = d3.scaleQuantize()
        .domain([0, 1])
        .range([0, 0.5, 1]);

    // Draw initial circles
    circles = svg.selectAll('circle')
        .data(stations, d => d.short_name)
        .enter()
        .append('circle')
        .attr('r', d => radiusScale(d.totalTraffic))
        .attr('fill', 'steelblue')
        .attr('stroke', 'white')
        .attr('stroke-width', 1)
        .attr('opacity', 0.6)
        .style('pointer-events', 'auto')
        .style('--departure-ratio', d => stationFlow(d.departures / d.totalTraffic))
        .each(function(d) {
        d3.select(this).append('title')
            .text(`${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
        });

    updatePositions();
    map.on('move', updatePositions);
    map.on('zoom', updatePositions);
    map.on('resize', updatePositions);
    map.on('moveend', updatePositions);

    // Initialize slider
    const timeSlider = document.getElementById('time-slider');
    timeSlider.addEventListener('input', updateTimeDisplay);
    updateTimeDisplay();
    createLegend(); // Create the legend
});