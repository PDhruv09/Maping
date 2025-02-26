// Import Mapbox as an ESM module
import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';

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

// Function to add Bluebikes stations as markers
async function addBikeStations(jsonPath) {
    try {
        const response = await fetch(jsonPath);
        const stationData = await response.json();
        console.log("Bluebikes station data loaded:", stationData);

        // Extract station information
        const stations = stationData.data.stations;

        stations.forEach(station => {
            const el = document.createElement('div');
            el.className = 'bike-station-marker';
            el.style.width = '12px';
            el.style.height = '12px';
            el.style.backgroundColor = '#ff0000'; // Red for bike stations
            el.style.borderRadius = '50%';

            // Create marker and add to map
            new mapboxgl.Marker(el)
                .setLngLat([station.lon, station.lat])
                .setPopup(new mapboxgl.Popup().setText(station.name)) // Add station name in a popup
                .addTo(map);
        });

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

    // Add Bluebikes stations
    await addBikeStations('assets/JSON/bluebikes-stations.json');
});
