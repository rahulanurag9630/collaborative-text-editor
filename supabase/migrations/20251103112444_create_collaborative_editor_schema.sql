/*
  # Collaborative Text Editor Database Schema

  ## Overview
  This migration creates the complete database structure for a real-time collaborative text editor
  with user authentication, document management, and sharing capabilities.

  ## New Tables

  ### 1. users
  Stores user account information for authentication and profile management.
  - `id` (uuid, primary key) - Unique user identifier
  - `email` (text, unique) - User email address for login
  - `password_hash` (text) - Encrypted password
  - `name` (text) - User's display name
  - `created_at` (timestamptz) - Account creation timestamp
  - `last_login` (timestamptz) - Last login timestamp

  ### 2. documents
  Stores document metadata and content.
  - `id` (uuid, primary key) - Unique document identifier
  - `title` (text) - Document title
  - `content` (jsonb) - Rich text content in JSON format
  - `owner_id` (uuid, foreign key) - References users table
  - `created_at` (timestamptz) - Document creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  - `last_saved_at` (timestamptz) - Last manual save timestamp

  ### 3. document_permissions
  Manages document sharing and access control.
  - `id` (uuid, primary key) - Unique permission identifier
  - `document_id` (uuid, foreign key) - References documents table
  - `user_id` (uuid, foreign key) - References users table
  - `role` (text) - Access level: 'owner', 'editor', or 'viewer'
  - `granted_at` (timestamptz) - Permission grant timestamp
  - `granted_by` (uuid) - User who granted the permission

  ### 4. active_sessions
  Tracks active editing sessions for real-time collaboration.
  - `id` (uuid, primary key) - Unique session identifier
  - `document_id` (uuid, foreign key) - References documents table
  - `user_id` (uuid, foreign key) - References users table
  - `socket_id` (text) - WebSocket connection identifier
  - `cursor_position` (jsonb) - Current cursor position
  - `last_activity` (timestamptz) - Last activity timestamp

  ## Security

  1. Row Level Security (RLS) is enabled on all tables
  2. Users can only access their own account data
  3. Document access is controlled through document_permissions table
  4. Only authenticated users can create and access documents
  5. Viewers can read, editors can modify, owners have full control

  ## Indexes

  - Email index on users table for fast login lookups
  - Document owner index for user's document listing
  - Permission lookup indexes for access control checks
  - Active session indexes for real-time collaboration queries
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_login timestamptz
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Untitled Document',
  content jsonb DEFAULT '{"ops": []}'::jsonb,
  owner_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_saved_at timestamptz DEFAULT now()
);

-- Create document_permissions table
CREATE TABLE IF NOT EXISTS document_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  granted_at timestamptz DEFAULT now(),
  granted_by uuid REFERENCES users(id),
  UNIQUE(document_id, user_id)
);

-- Create active_sessions table for real-time collaboration
CREATE TABLE IF NOT EXISTS active_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  socket_id text NOT NULL,
  cursor_position jsonb DEFAULT '{}'::jsonb,
  last_activity timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_updated ON documents(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_permissions_document ON document_permissions(document_id);
CREATE INDEX IF NOT EXISTS idx_permissions_user ON document_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_document ON active_sessions(document_id);
CREATE INDEX IF NOT EXISTS idx_sessions_socket ON active_sessions(socket_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS Policies for documents table
CREATE POLICY "Users can view documents they have access to"
  ON documents FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM document_permissions
      WHERE document_permissions.document_id = documents.id
      AND document_permissions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Document owners and editors can update documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM document_permissions
      WHERE document_permissions.document_id = documents.id
      AND document_permissions.user_id = auth.uid()
      AND document_permissions.role IN ('owner', 'editor')
    )
  )
  WITH CHECK (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM document_permissions
      WHERE document_permissions.document_id = documents.id
      AND document_permissions.user_id = auth.uid()
      AND document_permissions.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Document owners can delete documents"
  ON documents FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- RLS Policies for document_permissions table
CREATE POLICY "Users can view permissions for their documents"
  ON document_permissions FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_permissions.document_id
      AND documents.owner_id = auth.uid()
    )
  );

CREATE POLICY "Document owners can grant permissions"
  ON document_permissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_permissions.document_id
      AND documents.owner_id = auth.uid()
    )
  );

CREATE POLICY "Document owners can revoke permissions"
  ON document_permissions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_permissions.document_id
      AND documents.owner_id = auth.uid()
    )
  );

-- RLS Policies for active_sessions table
CREATE POLICY "Users can view sessions for documents they access"
  ON active_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = active_sessions.document_id
      AND (
        documents.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM document_permissions
          WHERE document_permissions.document_id = documents.id
          AND document_permissions.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can create their own sessions"
  ON active_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON active_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON active_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to automatically update document updated_at timestamp
CREATE OR REPLACE FUNCTION update_document_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update document timestamp on content changes
CREATE TRIGGER update_document_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_document_timestamp();
