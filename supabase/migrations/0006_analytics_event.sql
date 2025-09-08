-- This migration ensures analytics_event table has proper RLS policies
-- The table was already created in 0001_init_core.sql, but we need to ensure
-- the RLS policies are properly configured

-- Drop existing policies to recreate them with proper configuration
DROP POLICY IF EXISTS "teacher_can_read_analytics" ON analytics_event;
DROP POLICY IF EXISTS "anyone_can_insert_analytics" ON analytics_event;
DROP POLICY IF EXISTS "service_role_full_access_analytics" ON analytics_event;

-- Recreate RLS policies for analytics_event with proper configuration
-- Teachers can read all analytics events
CREATE POLICY "teacher_can_read_analytics" ON analytics_event
    FOR SELECT
    USING (get_current_role() = 'teacher');

-- Anyone can insert analytics events (for tracking VAM outcomes)
CREATE POLICY "anyone_can_insert_analytics" ON analytics_event
    FOR INSERT
    WITH CHECK (true);

-- Service role can do everything
CREATE POLICY "service_role_full_access_analytics" ON analytics_event
    FOR ALL
    USING (auth.role() = 'service_role');

-- Add additional indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_analytics_event_kind_created_at ON analytics_event(kind, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_event_payload_gin ON analytics_event USING GIN (payload);

-- Add constraint to ensure kind is not empty
ALTER TABLE analytics_event 
ADD CONSTRAINT analytics_event_kind_not_empty 
CHECK (kind IS NOT NULL AND length(trim(kind)) > 0);

-- Add constraint to ensure payload is a valid JSON object
ALTER TABLE analytics_event 
ADD CONSTRAINT analytics_event_payload_is_object 
CHECK (jsonb_typeof(payload) = 'object');

-- Create function to log VAM outcomes
CREATE OR REPLACE FUNCTION log_vam_outcome(
    p_kind TEXT,
    p_payload JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    event_id UUID;
BEGIN
    INSERT INTO analytics_event (kind, payload)
    VALUES (p_kind, p_payload)
    RETURNING id INTO event_id;
    
    RETURN event_id;
END;
$$;

-- Create function to get analytics summary for teachers
CREATE OR REPLACE FUNCTION get_analytics_summary(
    p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
    p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
    kind TEXT,
    count BIGINT,
    latest_event TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only allow teachers to access this function
    IF get_current_role() != 'teacher' THEN
        RAISE EXCEPTION 'Access denied: Only teachers can access analytics summary';
    END IF;
    
    RETURN QUERY
    SELECT 
        ae.kind,
        COUNT(*) as count,
        MAX(ae.created_at) as latest_event
    FROM analytics_event ae
    WHERE ae.created_at BETWEEN p_start_date AND p_end_date
    GROUP BY ae.kind
    ORDER BY count DESC;
END;
$$;
