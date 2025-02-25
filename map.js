// Import Mapbox as an ESM module
import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';

// Check that Mapbox GL JS is loaded
console.log("Mapbox GL JS Loaded:", mapboxgl);

// Set your Mapbox access token here
mapboxgl.accessToken = 'pk.eyJ1IjoicGRocnV2LTA5IiwiYSI6ImNtN2t6djRqcDAyeWkybnB2Z3ZnMHFjajgifQ.Eq2u_G3zeC9g_T9MPQE0fA';

// Initialize the map
const map = new mapboxgl.Map({
  container: 'map', // ID of the div where the map will render
  style: 'mapbox://styles/mapbox/navigation-night-v1', // Map style
  center: [-71.09415, 42.36027], // [longitude, latitude]
  zoom: 12, // Initial zoom level
  minZoom: 5, // Minimum allowed zoom
  maxZoom: 18 // Maximum allowed zoom
});

// Wait for the map to load before adding data
map.on('load', async () => {
    console.log("Map has loaded!");

    // Load the GeoJSON file
    try {
        const response = await fetch('assets/JSON/Existing_Bike_Network_2022.geojson'); // Ensure the path is correct
        const bikeData = await response.json();
        console.log("Bike lane data loaded:", bikeData);

        // Add GeoJSON source to the map
        map.addSource('bike-lanes', {
            type: 'geojson',
            data: bikeData
        });

        // Add a layer to visualize the bike lanes
        map.addLayer({
            id: 'bike-lane-layer',
            type: 'line',
            source: 'bike-lanes',
            paint: {
                'line-color': '#00FF00',  // Green color for bike lanes
                'line-width': 3,          // Line thickness
                'line-opacity': 0.7       // Adjust transparency
            }
        });

        console.log("Bike lanes added to the map.");
    } catch (error) {
        console.error("Error loading GeoJSON file:", error);
    }
});
