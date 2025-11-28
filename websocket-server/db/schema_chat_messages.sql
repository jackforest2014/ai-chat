-- Chat Messages Table Schema
-- Stores all chat messages including text, audio, image, and video
-- System user ID is 10, regular users have their own IDs

-- Message type enum
-- Note: Using VARCHAR with CHECK constraint instead of ENUM for flexibility
-- Valid types: 'text', 'image', 'audio', 'video'

CREATE TABLE IF NOT EXISTS chat_messages (
    -- Primary Key
    id BIGSERIAL PRIMARY KEY,

    -- User References (semantic, no FK constraints)
    -- user_id: sender of the message
    -- to_user_id: recipient of the message
    -- System messages: user_id = 10, to_user_id = actual user
    -- User messages: user_id = actual user, to_user_id = 10 (system)
    user_id INTEGER NOT NULL,
    to_user_id INTEGER NOT NULL,

    -- Message Type
    -- 'text': plain text message, content in text_content
    -- 'image': image message, URL in text_content or binary in content
    -- 'audio': voice message, transcript in text_content, audio data in content
    -- 'video': video message, description in text_content, video data in content
    msg_type VARCHAR(20) NOT NULL DEFAULT 'text',

    -- Text Content (supports emojis via UTF8MB4/UTF-8)
    -- For text: the actual message
    -- For image: optional URL or description
    -- For audio: optional transcript
    -- For video: optional description
    text_content TEXT,

    -- Binary/Large Content
    -- For image: image bytes or base64 encoded string
    -- For audio: audio data (WebM/Opus format recommended)
    -- For video: video data or reference
    content BYTEA,

    -- Content metadata (JSON for flexibility)
    -- For audio: { "duration_ms": 5000, "mime_type": "audio/webm", "sample_rate": 48000 }
    -- For image: { "width": 800, "height": 600, "mime_type": "image/jpeg" }
    -- For text with Q&A match: { "from_qa": true, "similarity": 0.87, "matched_question": "..." }
    metadata JSONB,

    -- Session tracking (optional, for grouping conversations)
    session_id VARCHAR(255),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT valid_msg_type CHECK (msg_type IN ('text', 'image', 'audio', 'video')),
    CONSTRAINT valid_user_id CHECK (user_id > 0),
    CONSTRAINT valid_to_user_id CHECK (to_user_id > 0)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages (user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_to_user_id ON chat_messages (to_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages (session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_messages_msg_type ON chat_messages (msg_type);

-- Composite index for conversation queries (between two users)
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages (
    LEAST(user_id, to_user_id),
    GREATEST(user_id, to_user_id),
    created_at DESC
);

-- Comments documenting semantic references
COMMENT ON TABLE chat_messages IS 'Stores all chat messages including text, audio, image, and video. System user ID is 10.';
COMMENT ON COLUMN chat_messages.user_id IS 'Semantic reference to users.id - sender of the message. System = 10.';
COMMENT ON COLUMN chat_messages.to_user_id IS 'Semantic reference to users.id - recipient of the message. System = 10.';
COMMENT ON COLUMN chat_messages.msg_type IS 'Message type: text, image, audio, video';
COMMENT ON COLUMN chat_messages.text_content IS 'Text content or description. Supports emojis via UTF-8.';
COMMENT ON COLUMN chat_messages.content IS 'Binary content for audio/image/video messages.';
COMMENT ON COLUMN chat_messages.metadata IS 'JSON metadata: duration, mime_type, Q&A match info, etc.';

-- Grant permissions
GRANT ALL PRIVILEGES ON TABLE chat_messages TO chatapp;
GRANT USAGE, SELECT ON SEQUENCE chat_messages_id_seq TO chatapp;
