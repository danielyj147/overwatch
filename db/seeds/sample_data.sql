-- Sample data for development and testing
-- Insert sample layers and features

-- Insert sample layers
INSERT INTO layers (id, name, description, layer_type, style, z_index) VALUES
(
    'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    'Blue Force',
    'Friendly units and assets',
    'units',
    '{"color": "#4A90D9", "icon": "friendly-unit"}',
    100
),
(
    'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e',
    'Annotations',
    'User-drawn annotations and markings',
    'annotations',
    '{"color": "#FFD700", "strokeWidth": 2}',
    200
),
(
    'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f',
    'Objectives',
    'Mission objectives and waypoints',
    'points',
    '{"color": "#FF6B6B", "icon": "objective"}',
    150
),
(
    'd4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a',
    'Operational Zones',
    'Area boundaries and zones of control',
    'zones',
    '{"fillColor": "#4A90D9", "fillOpacity": 0.2, "strokeColor": "#4A90D9", "strokeWidth": 2}',
    50
)
ON CONFLICT (id) DO NOTHING;

-- Insert sample features
-- Blue Force units (sample military positions near a training area)
INSERT INTO features (id, layer_id, name, feature_type, geometry, properties, style) VALUES
(
    'f1a2b3c4-d5e6-4f5a-8b9c-0d1e2f3a4b5c',
    'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    'Alpha Team',
    'point',
    ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326),
    '{"callsign": "ALPHA-1", "unitType": "infantry", "status": "active", "strength": 12}',
    '{"icon": "infantry", "color": "#4A90D9"}'
),
(
    'f2b3c4d5-e6f7-5a6b-9c0d-1e2f3a4b5c6d',
    'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    'Bravo Team',
    'point',
    ST_SetSRID(ST_MakePoint(-122.4094, 37.7849), 4326),
    '{"callsign": "BRAVO-1", "unitType": "infantry", "status": "active", "strength": 10}',
    '{"icon": "infantry", "color": "#4A90D9"}'
),
(
    'f3c4d5e6-f7a8-6b7c-0d1e-2f3a4b5c6d7e',
    'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    'Command Post',
    'point',
    ST_SetSRID(ST_MakePoint(-122.4294, 37.7649), 4326),
    '{"callsign": "HQ-ACTUAL", "unitType": "headquarters", "status": "active"}',
    '{"icon": "headquarters", "color": "#4A90D9"}'
)
ON CONFLICT (id) DO NOTHING;

-- Objectives
INSERT INTO features (id, layer_id, name, feature_type, geometry, properties, style) VALUES
(
    'o1a2b3c4-d5e6-4f5a-8b9c-0d1e2f3a4b5c',
    'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f',
    'Objective Alpha',
    'point',
    ST_SetSRID(ST_MakePoint(-122.3994, 37.7949), 4326),
    '{"priority": "primary", "status": "pending", "description": "Secure communications relay"}',
    '{"icon": "objective", "color": "#FF6B6B"}'
),
(
    'o2b3c4d5-e6f7-5a6b-9c0d-1e2f3a4b5c6d',
    'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f',
    'Objective Bravo',
    'point',
    ST_SetSRID(ST_MakePoint(-122.3894, 37.8049), 4326),
    '{"priority": "secondary", "status": "pending", "description": "Establish observation post"}',
    '{"icon": "objective", "color": "#FFA500"}'
)
ON CONFLICT (id) DO NOTHING;

-- Operational Zone (polygon around the operational area)
INSERT INTO features (id, layer_id, name, feature_type, geometry, properties, style) VALUES
(
    'z1a2b3c4-d5e6-4f5a-8b9c-0d1e2f3a4b5c',
    'd4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a',
    'Area of Operations',
    'polygon',
    ST_SetSRID(ST_GeomFromText('POLYGON((-122.45 37.75, -122.45 37.82, -122.37 37.82, -122.37 37.75, -122.45 37.75))'), 4326),
    '{"zoneType": "AO", "classification": "UNCLASSIFIED", "description": "Primary area of operations"}',
    '{"fillColor": "#4A90D9", "fillOpacity": 0.1, "strokeColor": "#4A90D9", "strokeWidth": 2}'
),
(
    'z2b3c4d5-e6f7-5a6b-9c0d-1e2f3a4b5c6d',
    'd4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a',
    'Restricted Zone',
    'polygon',
    ST_SetSRID(ST_GeomFromText('POLYGON((-122.42 37.77, -122.42 37.79, -122.40 37.79, -122.40 37.77, -122.42 37.77))'), 4326),
    '{"zoneType": "restricted", "classification": "UNCLASSIFIED", "description": "No-fly zone"}',
    '{"fillColor": "#FF6B6B", "fillOpacity": 0.2, "strokeColor": "#FF6B6B", "strokeWidth": 2, "strokeDasharray": [5, 5]}'
)
ON CONFLICT (id) DO NOTHING;

-- Sample annotation (a planned route)
INSERT INTO features (id, layer_id, name, feature_type, geometry, properties, style) VALUES
(
    'a1a2b3c4-d5e6-4f5a-8b9c-0d1e2f3a4b5c',
    'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e',
    'Primary Route',
    'line',
    ST_SetSRID(ST_GeomFromText('LINESTRING(-122.4294 37.7649, -122.4194 37.7749, -122.4094 37.7849, -122.3994 37.7949)'), 4326),
    '{"routeType": "primary", "description": "Main advance route to Objective Alpha"}',
    '{"strokeColor": "#FFD700", "strokeWidth": 3}'
)
ON CONFLICT (id) DO NOTHING;
