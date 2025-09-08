-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create user_roles table
CREATE TABLE user_roles (
    user_id UUID PRIMARY KEY,
    role TEXT NOT NULL CHECK (role IN ('public', 'calc_paid', 'teacher', 'all_paid')) DEFAULT 'public',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create kb_document table
CREATE TABLE kb_document (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject TEXT NOT NULL CHECK (subject = 'calc'),
    exam_variant TEXT NULL CHECK (exam_variant IN ('calc_ab', 'calc_bc')),
    partition TEXT NOT NULL CHECK (partition IN ('public_kb', 'paraphrased_kb', 'private_kb')),
    topic TEXT,
    subtopic TEXT,
    year INTEGER,
    difficulty TEXT,
    type TEXT,
    bloom_level TEXT,
    refs JSONB DEFAULT '{}'::jsonb,
    content TEXT NOT NULL,
    latex JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create kb_embedding table
CREATE TABLE kb_embedding (
    doc_id UUID PRIMARY KEY REFERENCES kb_document(id) ON DELETE CASCADE,
    embedding VECTOR(1536) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create analytics_event table
CREATE TABLE analytics_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create helper function to get current user role
CREATE OR REPLACE FUNCTION get_current_role()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN COALESCE(
        (SELECT role FROM user_roles WHERE user_id = auth.uid()),
        'public'
    );
END;
$$;

-- Enable Row Level Security
ALTER TABLE kb_document ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_embedding ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_event ENABLE ROW LEVEL SECURITY;

-- RLS Policies for kb_document
-- Public users can only see public_kb documents
CREATE POLICY "public_can_read_public_kb" ON kb_document
    FOR SELECT
    USING (partition = 'public_kb');

-- Paid users can see public_kb and paraphrased_kb documents
CREATE POLICY "paid_can_read_public_and_paraphrased_kb" ON kb_document
    FOR SELECT
    USING (
        get_current_role() IN ('calc_paid', 'teacher', 'all_paid') 
        AND partition IN ('public_kb', 'paraphrased_kb')
    );

-- Only teachers can see private_kb documents
CREATE POLICY "teacher_can_read_private_kb" ON kb_document
    FOR SELECT
    USING (
        get_current_role() = 'teacher' 
        AND partition = 'private_kb'
    );

-- Service role can insert/update/delete all documents
CREATE POLICY "service_role_full_access_kb_document" ON kb_document
    FOR ALL
    USING (auth.role() = 'service_role');

-- RLS Policies for kb_embedding
-- Same access patterns as kb_document
CREATE POLICY "public_can_read_public_kb_embeddings" ON kb_embedding
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM kb_document 
            WHERE id = kb_embedding.doc_id 
            AND partition = 'public_kb'
        )
    );

CREATE POLICY "paid_can_read_public_and_paraphrased_kb_embeddings" ON kb_embedding
    FOR SELECT
    USING (
        get_current_role() IN ('calc_paid', 'teacher', 'all_paid')
        AND EXISTS (
            SELECT 1 FROM kb_document 
            WHERE id = kb_embedding.doc_id 
            AND partition IN ('public_kb', 'paraphrased_kb')
        )
    );

CREATE POLICY "teacher_can_read_private_kb_embeddings" ON kb_embedding
    FOR SELECT
    USING (
        get_current_role() = 'teacher'
        AND EXISTS (
            SELECT 1 FROM kb_document 
            WHERE id = kb_embedding.doc_id 
            AND partition = 'private_kb'
        )
    );

CREATE POLICY "service_role_full_access_kb_embedding" ON kb_embedding
    FOR ALL
    USING (auth.role() = 'service_role');

-- RLS Policies for analytics_event
-- Teachers can read all analytics events
CREATE POLICY "teacher_can_read_analytics" ON analytics_event
    FOR SELECT
    USING (get_current_role() = 'teacher');

-- Anyone can insert analytics events (for tracking)
CREATE POLICY "anyone_can_insert_analytics" ON analytics_event
    FOR INSERT
    WITH CHECK (true);

-- Service role can do everything
CREATE POLICY "service_role_full_access_analytics" ON analytics_event
    FOR ALL
    USING (auth.role() = 'service_role');

-- Create indexes for performance
CREATE INDEX idx_kb_document_subject ON kb_document(subject);
CREATE INDEX idx_kb_document_exam_variant ON kb_document(exam_variant);
CREATE INDEX idx_kb_document_partition ON kb_document(partition);
CREATE INDEX idx_kb_document_created_at ON kb_document(created_at);
CREATE INDEX idx_analytics_event_kind ON analytics_event(kind);
CREATE INDEX idx_analytics_event_created_at ON analytics_event(created_at);
