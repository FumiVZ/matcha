-- Profile views table to track who viewed whose profile
CREATE TABLE IF NOT EXISTS profile_views (
    id SERIAL PRIMARY KEY,
    viewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    viewed_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Prevent duplicate entries for same viewer/viewed pair (we'll update timestamp instead)
    UNIQUE(viewer_id, viewed_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profile_views_viewed_id ON profile_views(viewed_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewed_at ON profile_views(viewed_at DESC);
