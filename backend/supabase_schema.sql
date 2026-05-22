-- =============================================
-- PadelAI Tutor — Esquema PostgreSQL para Supabase
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- =============================================

-- Enums
CREATE TYPE message_role AS ENUM ('user', 'assistant', 'system');
CREATE TYPE subscription_plan AS ENUM ('free', 'pro_monthly', 'pro_yearly', 'elite');
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'incomplete');
CREATE TYPE video_status AS ENUM ('uploaded', 'processing', 'completed', 'failed');

-- Users
CREATE TABLE users (
    email VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL,
    is_verified BOOLEAN NOT NULL,
    id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    PRIMARY KEY (id)
);
CREATE UNIQUE INDEX ix_users_email ON users (email);

-- Conversations
CREATE TABLE conversations (
    user_id UUID NOT NULL,
    title VARCHAR(200) NOT NULL,
    id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY(user_id) REFERENCES users (id)
);
CREATE INDEX ix_conversations_user_id ON conversations (user_id);

-- Chat Messages
CREATE TABLE chat_messages (
    conversation_id UUID NOT NULL,
    role message_role NOT NULL,
    content TEXT NOT NULL,
    metadata JSON,
    id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY(conversation_id) REFERENCES conversations (id)
);
CREATE INDEX ix_chat_messages_conversation_id ON chat_messages (conversation_id);

-- Subscriptions
CREATE TABLE subscriptions (
    user_id UUID NOT NULL,
    plan subscription_plan NOT NULL,
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    status subscription_status NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE,
    id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (user_id),
    FOREIGN KEY(user_id) REFERENCES users (id)
);

-- Video Recordings
CREATE TABLE video_recordings (
    user_id UUID NOT NULL,
    title VARCHAR(200) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),
    duration_seconds INTEGER,
    status video_status NOT NULL,
    id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY(user_id) REFERENCES users (id)
);
CREATE INDEX ix_video_recordings_user_id ON video_recordings (user_id);

-- Analysis Results
CREATE TABLE analysis_results (
    video_id UUID NOT NULL,
    pose_data JSON,
    feedback JSON,
    score FLOAT,
    summary TEXT,
    id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (video_id),
    FOREIGN KEY(video_id) REFERENCES video_recordings (id)
);
