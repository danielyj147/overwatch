-- Operational layers table
-- Layers organize features into logical groups (e.g., "Blue Force", "Objectives", "Threats")

CREATE TABLE IF NOT EXISTS layers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    layer_type TEXT NOT NULL CHECK (layer_type IN ('units', 'annotations', 'zones', 'routes', 'points')),
    style JSONB DEFAULT '{}',
    z_index INTEGER DEFAULT 0,
    visible BOOLEAN DEFAULT true,
    locked BOOLEAN DEFAULT false,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for ordering layers
CREATE INDEX IF NOT EXISTS idx_layers_z_index ON layers(z_index);

-- Index for filtering by type
CREATE INDEX IF NOT EXISTS idx_layers_type ON layers(layer_type);

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_layers_updated_at
    BEFORE UPDATE ON layers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
