-- Geospatial features table
-- Stores all map features with PostGIS geometry

CREATE TABLE IF NOT EXISTS features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    layer_id UUID NOT NULL REFERENCES layers(id) ON DELETE CASCADE,
    name TEXT,
    feature_type TEXT NOT NULL CHECK (feature_type IN ('point', 'line', 'polygon', 'circle', 'rectangle')),
    geometry GEOMETRY(Geometry, 4326) NOT NULL,
    properties JSONB DEFAULT '{}',
    style JSONB DEFAULT '{}',
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spatial index for efficient geographic queries
CREATE INDEX IF NOT EXISTS idx_features_geometry ON features USING GIST(geometry);

-- Index for layer filtering
CREATE INDEX IF NOT EXISTS idx_features_layer ON features(layer_id);

-- Index for feature type filtering
CREATE INDEX IF NOT EXISTS idx_features_type ON features(feature_type);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_features_layer_type ON features(layer_id, feature_type);

-- Auto-update timestamp trigger
CREATE TRIGGER update_features_updated_at
    BEFORE UPDATE ON features
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to get features as GeoJSON
CREATE OR REPLACE FUNCTION features_as_geojson(p_layer_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
BEGIN
    RETURN (
        SELECT jsonb_build_object(
            'type', 'FeatureCollection',
            'features', COALESCE(jsonb_agg(
                jsonb_build_object(
                    'type', 'Feature',
                    'id', f.id,
                    'geometry', ST_AsGeoJSON(f.geometry)::jsonb,
                    'properties', f.properties || jsonb_build_object(
                        'id', f.id,
                        'name', f.name,
                        'feature_type', f.feature_type,
                        'layer_id', f.layer_id,
                        'style', f.style
                    )
                )
            ), '[]'::jsonb)
        )
        FROM features f
        WHERE p_layer_id IS NULL OR f.layer_id = p_layer_id
    );
END;
$$ LANGUAGE plpgsql;
