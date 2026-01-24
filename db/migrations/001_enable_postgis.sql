-- Enable required PostgreSQL extensions
-- PostGIS for spatial data support
-- UUID for generating unique identifiers

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- For text search optimization
