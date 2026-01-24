#!/bin/bash
# Import OpenStreetMap data into PostGIS
# This script downloads and imports OSM data for a specified region

set -e

REGION=${1:-"san-francisco"}
DOWNLOAD_DIR="./data/osm"

echo "=== Overwatch OSM Import ==="
echo "Region: $REGION"

# Create download directory
mkdir -p "$DOWNLOAD_DIR"

# Check for required tools
command -v osm2pgsql >/dev/null 2>&1 || {
    echo "osm2pgsql is required but not installed."
    echo "Install with: brew install osm2pgsql (macOS) or apt install osm2pgsql (Ubuntu)"
    exit 1
}

# Download OSM data (using Geofabrik extracts)
OSM_FILE="$DOWNLOAD_DIR/${REGION}-latest.osm.pbf"
if [ ! -f "$OSM_FILE" ]; then
    echo "Downloading OSM data for $REGION..."
    # Note: You'll need to adjust the URL based on the region
    # See https://download.geofabrik.de/ for available regions
    curl -L -o "$OSM_FILE" "https://download.geofabrik.de/north-america/us/california/${REGION}-latest.osm.pbf"
fi

# Import into PostGIS
echo "Importing OSM data into PostGIS..."
osm2pgsql \
    --create \
    --slim \
    --database "$DATABASE_URL" \
    --prefix osm \
    --style /usr/share/osm2pgsql/default.style \
    "$OSM_FILE"

echo "=== OSM Import Complete ==="
