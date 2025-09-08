-- Create webhook_event table for idempotency and audit logging
CREATE TABLE webhook_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    event_type TEXT NOT NULL,
    received_at TIMESTAMPTZ DEFAULT NOW(),
    signature_ok BOOLEAN NOT NULL DEFAULT false,
    http_status INTEGER,
    payload JSONB DEFAULT '{}'::jsonb,
    dedupe_key TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique constraint for idempotency (provider + dedupe_key)
CREATE UNIQUE INDEX idx_webhook_event_provider_dedupe_key 
ON webhook_event(provider, dedupe_key);

-- Enable Row Level Security
ALTER TABLE webhook_event ENABLE ROW LEVEL SECURITY;

-- RLS Policies for webhook_event
-- Teachers can read all webhook events (for debugging/monitoring)
CREATE POLICY "teacher_can_read_webhook_events" ON webhook_event
    FOR SELECT
    USING (get_current_role() = 'teacher');

-- Service role can insert webhook events (for webhook handlers)
CREATE POLICY "service_role_can_insert_webhook_events" ON webhook_event
    FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

-- Service role can update webhook events (for status updates)
CREATE POLICY "service_role_can_update_webhook_events" ON webhook_event
    FOR UPDATE
    USING (auth.role() = 'service_role');

-- Service role can do everything
CREATE POLICY "service_role_full_access_webhook_events" ON webhook_event
    FOR ALL
    USING (auth.role() = 'service_role');

-- Create indexes for performance
CREATE INDEX idx_webhook_event_provider ON webhook_event(provider);
CREATE INDEX idx_webhook_event_event_type ON webhook_event(event_type);
CREATE INDEX idx_webhook_event_received_at ON webhook_event(received_at);
CREATE INDEX idx_webhook_event_signature_ok ON webhook_event(signature_ok);
CREATE INDEX idx_webhook_event_http_status ON webhook_event(http_status);
CREATE INDEX idx_webhook_event_created_at ON webhook_event(created_at);

-- Composite indexes for common queries
CREATE INDEX idx_webhook_event_provider_event_type ON webhook_event(provider, event_type);
CREATE INDEX idx_webhook_event_provider_received_at ON webhook_event(provider, received_at);
CREATE INDEX idx_webhook_event_signature_ok_received_at ON webhook_event(signature_ok, received_at);

-- Add constraints
ALTER TABLE webhook_event 
ADD CONSTRAINT webhook_event_provider_not_empty 
CHECK (provider IS NOT NULL AND length(trim(provider)) > 0);

ALTER TABLE webhook_event 
ADD CONSTRAINT webhook_event_event_type_not_empty 
CHECK (event_type IS NOT NULL AND length(trim(event_type)) > 0);

ALTER TABLE webhook_event 
ADD CONSTRAINT webhook_event_dedupe_key_not_empty 
CHECK (dedupe_key IS NOT NULL AND length(trim(dedupe_key)) > 0);

ALTER TABLE webhook_event 
ADD CONSTRAINT webhook_event_http_status_valid 
CHECK (http_status IS NULL OR (http_status >= 100 AND http_status < 600));

-- Add constraint to ensure payload is a valid JSON object
ALTER TABLE webhook_event 
ADD CONSTRAINT webhook_event_payload_is_object 
CHECK (jsonb_typeof(payload) = 'object');
