-- Create kb_canonical_solution table
CREATE TABLE kb_canonical_solution (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject TEXT NOT NULL CHECK (subject = 'calc'),
    exam_variant TEXT NULL CHECK (exam_variant IN ('calc_ab', 'calc_bc')),
    unit TEXT NOT NULL,
    skill TEXT NOT NULL,
    problem_key TEXT UNIQUE NOT NULL,
    question_template TEXT NOT NULL,
    steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    final_answer TEXT NOT NULL,
    rubric JSONB DEFAULT '{}'::jsonb,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create kb_canonical_embedding table
CREATE TABLE kb_canonical_embedding (
    solution_id UUID PRIMARY KEY REFERENCES kb_canonical_solution(id) ON DELETE CASCADE,
    embedding VECTOR(1536) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE kb_canonical_solution ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_canonical_embedding ENABLE ROW LEVEL SECURITY;

-- RLS Policies for kb_canonical_solution
-- Teachers can read all canonical solutions
CREATE POLICY "teacher_can_read_canonical_solutions" ON kb_canonical_solution
    FOR SELECT
    USING (get_current_role() = 'teacher');

-- Service role can do everything with canonical solutions
CREATE POLICY "service_role_full_access_canonical_solution" ON kb_canonical_solution
    FOR ALL
    USING (auth.role() = 'service_role');

-- RLS Policies for kb_canonical_embedding
-- Teachers can read canonical embeddings
CREATE POLICY "teacher_can_read_canonical_embeddings" ON kb_canonical_embedding
    FOR SELECT
    USING (get_current_role() = 'teacher');

-- Service role can do everything with canonical embeddings
CREATE POLICY "service_role_full_access_canonical_embedding" ON kb_canonical_embedding
    FOR ALL
    USING (auth.role() = 'service_role');

-- Create indexes for canonical solutions
CREATE INDEX idx_canonical_solution_subject ON kb_canonical_solution(subject);
CREATE INDEX idx_canonical_solution_exam_variant ON kb_canonical_solution(exam_variant);
CREATE INDEX idx_canonical_solution_unit ON kb_canonical_solution(unit);
CREATE INDEX idx_canonical_solution_skill ON kb_canonical_solution(skill);
CREATE INDEX idx_canonical_solution_problem_key ON kb_canonical_solution(problem_key);
CREATE INDEX idx_canonical_solution_tags ON kb_canonical_solution USING GIN (tags);
CREATE INDEX idx_canonical_solution_created_at ON kb_canonical_solution(created_at);

-- Composite indexes for common queries
CREATE INDEX idx_canonical_solution_subject_exam_variant ON kb_canonical_solution(subject, exam_variant);
CREATE INDEX idx_canonical_solution_unit_skill ON kb_canonical_solution(unit, skill);
CREATE INDEX idx_canonical_solution_subject_unit ON kb_canonical_solution(subject, unit);

-- Vector similarity search index for canonical embeddings
CREATE INDEX idx_canonical_embedding_vector_ivfflat ON kb_canonical_embedding 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 50);

-- Add constraint to ensure problem_key is unique and not null
ALTER TABLE kb_canonical_solution 
ADD CONSTRAINT canonical_solution_problem_key_not_null 
CHECK (problem_key IS NOT NULL AND length(trim(problem_key)) > 0);

-- Add constraint to ensure steps is a valid JSON array
ALTER TABLE kb_canonical_solution 
ADD CONSTRAINT canonical_solution_steps_is_array 
CHECK (jsonb_typeof(steps) = 'array');

-- Add constraint to ensure rubric is a valid JSON object
ALTER TABLE kb_canonical_solution 
ADD CONSTRAINT canonical_solution_rubric_is_object 
CHECK (jsonb_typeof(rubric) = 'object');
