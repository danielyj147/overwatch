-- Yjs document persistence table
-- Used by Hocuspocus to store collaborative document state

CREATE TABLE IF NOT EXISTS yjs_documents (
    name TEXT PRIMARY KEY,
    data BYTEA NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for finding recently updated documents
CREATE INDEX IF NOT EXISTS idx_yjs_documents_updated ON yjs_documents(updated_at DESC);

-- Auto-update timestamp trigger
CREATE TRIGGER update_yjs_documents_updated_at
    BEFORE UPDATE ON yjs_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up old documents (can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_old_yjs_documents(older_than INTERVAL DEFAULT '30 days')
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM yjs_documents
    WHERE updated_at < NOW() - older_than
    AND name NOT LIKE 'persistent:%';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
