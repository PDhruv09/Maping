// Import Mapbox as an ESM module
import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';

// Check that Mapbox GL JS is loaded
console.log("Mapbox GL JS Loaded:", mapboxgl);

// Set your Mapbox access token here
mapboxgl.accessToken = 'pk.eyJ1IjoicGRocnV2LTA5IiwiYSI6ImNtN2t6djRqcDAyeWkybnB2Z3ZnMHFjajgifQ.Eq2u_G3zeC9g_T9MPQE0fA';

// Initialize the map
const map = new mapboxgl.Map({
  container: 'map', // ID of the div where the map will render
  style: 'mapbox://styles/pdhruv-09/cm7l4bjhf003o01su5ca46v6l', // Custom Mapbox Studio style
  center: [-71.09415, 42.36027], // [longitude, latitude] for Boston
  zoom: 12, // Initial zoom level
  minZoom: 5, // Minimum allowed zoom
  maxZoom: 18 // Maximum allowed zoom
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
                'line-color': color,  // Color for bike lanes
                'line-width': 3,      // Line thickness
                'line-opacity': 0.7   // Adjust transparency
            }
        });

        console.log(`${sourceId} added to the map.`);
    } catch (error) {
        console.error(`Error loading ${sourceId}:`, error);
    }
}

// Wait for the map to load before adding data
map.on('load', async () => {
    console.log("Map has loaded!");

    // Add Boston bike lanes (green)
    await addBikeLanes('bike-lanes-boston', 'bike-lane-layer-boston', 'assets/JSON/Existing_Bike_Network_2022.geojson', '#00FF00');

    // Add Cambridge bike lanes (blue)
    await addBikeLanes('bike-lanes-cambridge', 'bike-lane-layer-cambridge', 'assets/JSON/Existing_Bike_Network_Cambridge.geojson', '#0000FF');
});
