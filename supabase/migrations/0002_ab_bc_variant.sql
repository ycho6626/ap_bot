-- Add composite indexes for better query performance
CREATE INDEX idx_kb_document_subject_exam_variant ON kb_document(subject, exam_variant);
CREATE INDEX idx_kb_document_subject_partition ON kb_document(subject, partition);

-- Add full-text search index on content
CREATE INDEX idx_kb_document_content_gin ON kb_document USING GIN (to_tsvector('english', content));

-- Add vector similarity search index (ivfflat for pgvector)
CREATE INDEX idx_kb_embedding_vector_ivfflat ON kb_embedding 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Add index for vector L2 distance search (alternative to cosine)
CREATE INDEX idx_kb_embedding_vector_l2 ON kb_embedding 
USING ivfflat (embedding vector_l2_ops) 
WITH (lists = 100);

-- Add index for exam variant filtering with content search
CREATE INDEX idx_kb_document_exam_variant_content ON kb_document(exam_variant) 
WHERE exam_variant IS NOT NULL;

-- Add partial indexes for partition-based queries
CREATE INDEX idx_kb_document_public_kb ON kb_document(subject, exam_variant, created_at) 
WHERE partition = 'public_kb';

CREATE INDEX idx_kb_document_paraphrased_kb ON kb_document(subject, exam_variant, created_at) 
WHERE partition = 'paraphrased_kb';

CREATE INDEX idx_kb_document_private_kb ON kb_document(subject, exam_variant, created_at) 
WHERE partition = 'private_kb';

-- Add index for topic/subtopic filtering
CREATE INDEX idx_kb_document_topic_subtopic ON kb_document(topic, subtopic) 
WHERE topic IS NOT NULL AND subtopic IS NOT NULL;

-- Add index for difficulty and type filtering
CREATE INDEX idx_kb_document_difficulty_type ON kb_document(difficulty, type) 
WHERE difficulty IS NOT NULL AND type IS NOT NULL;

-- Add index for year-based filtering
CREATE INDEX idx_kb_document_year ON kb_document(year) 
WHERE year IS NOT NULL;
