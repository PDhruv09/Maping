// Import Mapbox and D3 as ESM modules
import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Check that Mapbox GL JS is loaded
console.log("Mapbox GL JS Loaded:", mapboxgl);

// Set your Mapbox access token
mapboxgl.accessToken = 'pk.eyJ1IjoicGRocnV2LTA5IiwiYSI6ImNtN2t6djRqcDAyeWkybnB2Z3ZnMHFjajgifQ.Eq2u_G3zeC9g_T9MPQE0fA';

// Initialize the map
const map = new mapboxgl.Map({
  container: 'map', // ID of the div where the map will render
  style: 'mapbox://styles/pdhruv-09/cm7l54j16003s01ss1a55ejii', // Custom Mapbox Studio style
  center: [-71.09415, 42.36027], // Center on Boston
  zoom: 12,
  minZoom: 5,
  maxZoom: 18
});

// Function to load and display bike lanes
async function addBikeLanes(sourceId, layerId, geojsonPath, color) {
    try {
        const response = await fetch(geojsonPath);
        const bikeData = await response.json();
        console.log(`${sourceId} data loaded:`, bikeData);

        // Add GeoJSON source to the map
        map.addSource(sourceId, {
            type: 'geojson',
            data: bikeData
        });

        // Add a layer to visualize the bike lanes
        map.addLayer({
            id: layerId,
            type: 'line',
            source: sourceId,
            paint: {
                'line-color': color,
                'line-width': 3,
                'line-opacity': 0.7
            }
        });

        console.log(`${sourceId} added to the map.`);
    } catch (error) {
        console.error(`Error loading ${sourceId}:`, error);
    }
}

// Function to add an SVG overlay for Bluebikes stations using D3
async function addBikeStations(jsonPath) {
    try {
        const response = await fetch(jsonPath);
        const stationData = await response.json();
        console.log("Bluebikes station data loaded:", stationData);

        // Extract station information
        const stations = stationData.data.stations;

        // Select the Mapbox container and append an SVG element
        const svg = d3.select('#map').append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .style('position', 'absolute')
            .style('top', '0')
            .style('left', '0')
            .style('pointer-events', 'none'); // Allows interaction with the map

        // Helper function to convert lat/lon to screen coordinates
        function getCoords(station) {
            const point = new mapboxgl.LngLat(+station.lon, +station.lat);
            const { x, y } = map.project(point);
            return { cx: x, cy: y };
        }

        // Append circles for each station
        const circles = svg.selectAll('circle')
            .data(stations)
            .enter()
            .append('circle')
            .attr('r', 6)               // Radius of the circle
            .attr('fill', 'red')        // Color of bike station markers
            .attr('stroke', 'white')    // Circle border color
            .attr('stroke-width', 1)    // Circle border thickness
            .attr('opacity', 0.8)       // Circle opacity
            .on('mouseover', function (event, d) {  // Add tooltip behavior
                d3.select(this).attr('fill', 'yellow'); // Highlight on hover
            })
            .on('mouseout', function (event, d) {  
                d3.select(this).attr('fill', 'red'); // Restore original color
            });

        // Function to update circle positions when the map moves/zooms
        function updatePositions() {
            circles
                .attr('cx', d => getCoords(d).cx)
                .attr('cy', d => getCoords(d).cy);
        }

        // Initial position update when map loads
        updatePositions();

        // Update positions dynamically when the map moves
        map.on('move', updatePositions);
        map.on('zoom', updatePositions);
        map.on('resize', updatePositions);
        map.on('moveend', updatePositions);

        console.log("Bluebikes stations added to the map.");
    } catch (error) {
        console.error("Error loading Bluebikes stations:", error);
    }
}

// Wait for the map to load before adding data
map.on('load', async () => {
    console.log("Map has loaded!");

    // Add Boston bike lanes (green)
    await addBikeLanes('bike-lanes-boston', 'bike-lane-layer-boston', 'assets/JSON/Existing_Bike_Network_2022.geojson', '#00FF00');

    // Add Cambridge bike lanes (blue)
    await addBikeLanes('bike-lanes-cambridge', 'bike-lane-layer-cambridge', 'assets/JSON/Existing_Bike_Network_Cambridge.geojson', '#0000FF');

    // Add Bluebikes stations using D3 SVG overlay
    await addBikeStations('assets/JSON/bluebikes-stations.json');
});
