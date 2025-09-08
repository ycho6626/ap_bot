-- Create review_case table for human-in-the-loop review
CREATE TABLE review_case (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    subject TEXT NOT NULL CHECK (subject = 'calc'),
    exam_variant TEXT NULL CHECK (exam_variant IN ('calc_ab', 'calc_bc')),
    question TEXT NOT NULL,
    context JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL CHECK (status IN ('new', 'in_progress', 'resolved', 'canonicalized')) DEFAULT 'new',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create review_action table for tracking actions on review cases
CREATE TABLE review_action (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES review_case(id) ON DELETE CASCADE,
    actor UUID NOT NULL,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE review_case ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_action ENABLE ROW LEVEL SECURITY;

-- RLS Policies for review_case
-- Users can insert their own review cases
CREATE POLICY "users_can_insert_own_review_cases" ON review_case
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can read their own review cases
CREATE POLICY "users_can_read_own_review_cases" ON review_case
    FOR SELECT
    USING (auth.uid() = user_id);

-- Teachers can read all review cases
CREATE POLICY "teacher_can_read_all_review_cases" ON review_case
    FOR SELECT
    USING (get_current_role() = 'teacher');

-- Teachers can update all review cases
CREATE POLICY "teacher_can_update_all_review_cases" ON review_case
    FOR UPDATE
    USING (get_current_role() = 'teacher');

-- Service role can do everything
CREATE POLICY "service_role_full_access_review_case" ON review_case
    FOR ALL
    USING (auth.role() = 'service_role');

-- RLS Policies for review_action
-- Users can read actions for their own cases
CREATE POLICY "users_can_read_own_review_actions" ON review_action
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM review_case 
            WHERE id = review_action.case_id 
            AND user_id = auth.uid()
        )
    );

-- Teachers can read all review actions
CREATE POLICY "teacher_can_read_all_review_actions" ON review_action
    FOR SELECT
    USING (get_current_role() = 'teacher');

-- Teachers can insert review actions
CREATE POLICY "teacher_can_insert_review_actions" ON review_action
    FOR INSERT
    WITH CHECK (get_current_role() = 'teacher');

-- Service role can do everything
CREATE POLICY "service_role_full_access_review_action" ON review_action
    FOR ALL
    USING (auth.role() = 'service_role');

-- Create indexes for performance
CREATE INDEX idx_review_case_user_id ON review_case(user_id);
CREATE INDEX idx_review_case_subject ON review_case(subject);
CREATE INDEX idx_review_case_exam_variant ON review_case(exam_variant);
CREATE INDEX idx_review_case_status ON review_case(status);
CREATE INDEX idx_review_case_created_at ON review_case(created_at);
CREATE INDEX idx_review_case_updated_at ON review_case(updated_at);

CREATE INDEX idx_review_action_case_id ON review_action(case_id);
CREATE INDEX idx_review_action_actor ON review_action(actor);
CREATE INDEX idx_review_action_action ON review_action(action);
CREATE INDEX idx_review_action_created_at ON review_action(created_at);

-- Composite indexes for common queries
CREATE INDEX idx_review_case_subject_exam_variant ON review_case(subject, exam_variant);
CREATE INDEX idx_review_case_status_created_at ON review_case(status, created_at);
CREATE INDEX idx_review_case_user_id_status ON review_case(user_id, status);

-- Add constraints
ALTER TABLE review_case 
ADD CONSTRAINT review_case_question_not_empty 
CHECK (question IS NOT NULL AND length(trim(question)) > 0);

ALTER TABLE review_case 
ADD CONSTRAINT review_case_context_is_object 
CHECK (jsonb_typeof(context) = 'object');

ALTER TABLE review_action 
ADD CONSTRAINT review_action_action_not_empty 
CHECK (action IS NOT NULL AND length(trim(action)) > 0);

ALTER TABLE review_action 
ADD CONSTRAINT review_action_details_is_object 
CHECK (jsonb_typeof(details) = 'object');

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at on review_case
CREATE TRIGGER update_review_case_updated_at
    BEFORE UPDATE ON review_case
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
