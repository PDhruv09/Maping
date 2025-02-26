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

// Function to load and display bike lanes
async function addBikeLanes(sourceId, layerId, geojsonPath, color) {
    try {
        const response = await fetch(geojsonPath);
        const bikeData = await response.json();
        console.log(`${sourceId} data loaded:`, bikeData);

        // Ensure the source is added only once
        if (!map.getSource(sourceId)) {
            map.addSource(sourceId, {
                type: 'geojson',
                data: bikeData
            });

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
        } else {
            console.log(`Source ${sourceId} already exists.`);
        }
    } catch (error) {
        console.error(`Error loading ${sourceId}:`, error);
    }
}

// Function to add bike stations and traffic visualization
async function addBikeStations(stationsJsonPath, trafficCsvUrl) {
    try {
        const response = await fetch(stationsJsonPath);
        const stationData = await response.json();
        console.log("Bluebikes station data loaded:", stationData);

        let stations = stationData.data.stations;

        // Load and process traffic data
        const trips = await d3.csv(trafficCsvUrl);
        console.log("Bike traffic data loaded:", trips.length, "entries");

        // Compute departures and arrivals per station
        const departures = d3.rollup(trips, v => v.length, d => d.start_station_id);
        const arrivals = d3.rollup(trips, v => v.length, d => d.end_station_id);

        // Add traffic data to stations
        stations = stations.map(station => {
            let id = station.short_name;
            station.arrivals = arrivals.get(id) ?? 0;
            station.departures = departures.get(id) ?? 0;
            station.totalTraffic = station.arrivals + station.departures;
            return station;
        });

        console.log("Updated stations with traffic data:", stations);

        // D3 scale to adjust marker size based on traffic
        const radiusScale = d3.scaleSqrt()
            .domain([0, d3.max(stations, d => d.totalTraffic)])
            .range([2, 25]); // Min/max radius in pixels

        // Select the Mapbox container and append an SVG element
        const svg = d3.select('#map').append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .style('position', 'absolute')
            .style('top', '0')
            .style('left', '0')
            .style('pointer-events', 'none');

        // Helper function to convert lat/lon to screen coordinates
        function getCoords(station) {
            const point = new mapboxgl.LngLat(+station.lon, +station.lat);
            const { x, y } = map.project(point);
            return { cx: x, cy: y };
        }

        // Append circles for each station, sized by total traffic
        const circles = svg.selectAll('circle')
            .data(stations)
            .enter()
            .append('circle')
            .attr('r', d => radiusScale(d.totalTraffic)) // Scale radius based on traffic
            .attr('fill', 'steelblue')
            .attr('stroke', 'white')
            .attr('stroke-width', 1)
            .attr('opacity', 0.6)
            .each(function (d) {
                d3.select(this).append('title')
                    .text(`${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
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

        console.log("Bike stations with traffic data added to the map.");
    } catch (error) {
        console.error("Error loading Bluebikes stations or traffic data:", error);
    }
}

// Wait for the map to load before adding data
map.on('load', async () => {
    console.log("Map has loaded!");

    // Add Boston bike lanes (green)
    await addBikeLanes('bike-lanes-boston', 'bike-lane-layer-boston', 'assets/JSON/Existing_Bike_Network_2022.geojson', '#00FF00');

    // Add Cambridge bike lanes (blue)
    await addBikeLanes('bike-lanes-cambridge', 'bike-lane-layer-cambridge', 'assets/JSON/Existing_Bike_Network_Cambridge.geojson', '#0000FF');

    // Add Bluebikes stations using D3 SVG overlay with traffic data
    await addBikeStations('assets/JSON/bluebikes-stations.json', 'assets/csv/bluebikes-traffic-2024-03.csv');
});
