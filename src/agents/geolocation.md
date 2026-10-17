Farm location workflow:

1. The Farm Admin registers a farm using written details and supporting documents.
2. After MAO approval, clicking the approved farm opens the exact-location map.
3. The Farm Admin searches, clicks, drags the pin, or uses the browser location, then saves it.
4. Location data is stored in a separate table related to the approved farm:
   - latitude
   - longitude
   - location address
   - location provider
   - provider place ID
5. Located farms appear on the general map with a pin and farm name.

Maps use Leaflet, OpenStreetMap tiles, and Nominatim geocoding. No Google Maps API key or billing account is required.