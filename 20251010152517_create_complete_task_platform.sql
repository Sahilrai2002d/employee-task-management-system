/*
  # Complete Task Management Platform Schema

  ## Overview
  Complete database schema for a task management platform with employer/employee roles,
  individual and group tasks, progress tracking, and collaboration features.

  ## 1. New Tables

  ### `profiles`
  - `id` (uuid, primary key) - References auth.users(id)
  - `email` (text) - User email
  - `full_name` (text) - User's full name
  - `role` (text) - User role: 'employer', 'employee', or 'admin'
  - `avatar_url` (text, optional) - Profile picture URL
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last profile update

  ### `tasks`
  - `id` (uuid, primary key) - Unique task identifier
  - `title` (text) - Task title
  - `description` (text) - Detailed task description
  - `created_by` (uuid) - Employer who created the task
  - `is_group_task` (boolean) - Whether this is a group task
  - `priority` (text) - Priority level: 'low', 'medium', 'high', 'urgent'
  - `status` (text) - Overall task status
  - `deadline` (timestamptz, optional) - Task deadline
  - `required_skills` (text[], optional) - Array of required skills
  - `created_at` (timestamptz) - Task creation timestamp
  - `updated_at` (timestamptz) - Last task update

  ### `task_assignments`
  - Individual employee assignments to tasks with status tracking

  ### `work_logs`
  - Detailed progress updates from employees

  ### `task_comments`
  - Comments and discussions on tasks

  ### `task_files`
  - File attachments related to tasks

  ### `messages`
  - Direct messaging between users

  ### `notifications`
  - System notifications for users

  ## 2. Security
  - RLS enabled on all tables
  - Policies ensure proper access control
*/

-- Drop existing tables if they exist (in correct order to handle foreign keys)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS task_files CASCADE;
DROP TABLE IF EXISTS task_comments CASCADE;
DROP TABLE IF EXISTS work_logs CASCADE;
DROP TABLE IF EXISTS task_assignments CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Create profiles table
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('employer', 'employee', 'admin')),
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create tasks table
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_group_task boolean DEFAULT false,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  deadline timestamptz,
  required_skills text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create task_assignments table
CREATE TABLE task_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  individual_status text NOT NULL DEFAULT 'not_started' CHECK (individual_status IN ('not_started', 'in_progress', 'completed')),
  progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  assigned_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  completed_at timestamptz,
  UNIQUE(task_id, employee_id)
);

-- Create work_logs table
CREATE TABLE work_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES task_assignments(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  description text NOT NULL,
  hours_worked numeric(5,2),
  progress_update integer CHECK (progress_update >= 0 AND progress_update <= 100),
  created_at timestamptz DEFAULT now()
);

-- Create task_comments table
CREATE TABLE task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  comment_text text NOT NULL,
  is_feedback boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create task_files table
CREATE TABLE task_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  file_size integer,
  created_at timestamptz DEFAULT now()
);

-- Create messages table
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  message_text text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create notifications table
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('task_assigned', 'task_accepted', 'task_rejected', 'deadline_reminder', 'progress_update', 'comment_added', 'message_received')),
  title text NOT NULL,
  message text NOT NULL,
  related_task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX idx_task_assignments_employee_id ON task_assignments(employee_id);
CREATE INDEX idx_task_assignments_status ON task_assignments(status);
CREATE INDEX idx_work_logs_assignment_id ON work_logs(assignment_id);
CREATE INDEX idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX idx_task_files_task_id ON task_files(task_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Tasks policies
CREATE POLICY "Users can view relevant tasks" ON tasks FOR SELECT TO authenticated 
  USING (
    created_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM task_assignments WHERE task_assignments.task_id = tasks.id AND task_assignments.employee_id = auth.uid())
  );

CREATE POLICY "Employers can create tasks" ON tasks FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Employers can update their tasks" ON tasks FOR UPDATE TO authenticated 
  USING (created_by = auth.uid()) 
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Employers can delete their tasks" ON tasks FOR DELETE TO authenticated 
  USING (created_by = auth.uid());

-- Task assignments policies
CREATE POLICY "Users can view relevant assignments" ON task_assignments FOR SELECT TO authenticated 
  USING (
    employee_id = auth.uid() OR 
    assigned_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_assignments.task_id AND tasks.created_by = auth.uid())
  );

CREATE POLICY "Employers can create assignments" ON task_assignments FOR INSERT TO authenticated 
  WITH CHECK (
    assigned_by = auth.uid() AND 
    EXISTS (SELECT 1 FROM tasks WHERE tasks.id = task_id AND tasks.created_by = auth.uid())
  );

CREATE POLICY "Employees can update their assignments" ON task_assignments FOR UPDATE TO authenticated 
  USING (employee_id = auth.uid()) 
  WITH CHECK (employee_id = auth.uid());

-- Work logs policies
CREATE POLICY "Users can view relevant work logs" ON work_logs FOR SELECT TO authenticated 
  USING (
    employee_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM task_assignments ta 
      JOIN tasks t ON ta.task_id = t.id 
      WHERE ta.id = work_logs.assignment_id AND t.created_by = auth.uid()
    )
  );

CREATE POLICY "Employees can create work logs" ON work_logs FOR INSERT TO authenticated 
  WITH CHECK (
    employee_id = auth.uid() AND 
    EXISTS (SELECT 1 FROM task_assignments WHERE id = assignment_id AND employee_id = auth.uid())
  );

-- Task comments policies
CREATE POLICY "Users can view comments on their tasks" ON task_comments FOR SELECT TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_comments.task_id AND 
      (tasks.created_by = auth.uid() OR EXISTS (SELECT 1 FROM task_assignments WHERE task_assignments.task_id = tasks.id AND task_assignments.employee_id = auth.uid()))
    )
  );

CREATE POLICY "Users can create comments on their tasks" ON task_comments FOR INSERT TO authenticated 
  WITH CHECK (
    user_id = auth.uid() AND 
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_id AND 
      (tasks.created_by = auth.uid() OR EXISTS (SELECT 1 FROM task_assignments WHERE task_assignments.task_id = tasks.id AND task_assignments.employee_id = auth.uid()))
    )
  );

CREATE POLICY "Users can update own comments" ON task_comments FOR UPDATE TO authenticated 
  USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own comments" ON task_comments FOR DELETE TO authenticated 
  USING (user_id = auth.uid());

-- Task files policies
CREATE POLICY "Users can view files on their tasks" ON task_files FOR SELECT TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_files.task_id AND 
      (tasks.created_by = auth.uid() OR EXISTS (SELECT 1 FROM task_assignments WHERE task_assignments.task_id = tasks.id AND task_assignments.employee_id = auth.uid()))
    )
  );

CREATE POLICY "Users can upload files to their tasks" ON task_files FOR INSERT TO authenticated 
  WITH CHECK (
    uploaded_by = auth.uid() AND 
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_id AND 
      (tasks.created_by = auth.uid() OR EXISTS (SELECT 1 FROM task_assignments WHERE task_assignments.task_id = tasks.id AND task_assignments.employee_id = auth.uid()))
    )
  );

CREATE POLICY "Users can delete own files" ON task_files FOR DELETE TO authenticated 
  USING (uploaded_by = auth.uid());

-- Messages policies
CREATE POLICY "Users can view their messages" ON messages FOR SELECT TO authenticated 
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can send messages" ON messages FOR INSERT TO authenticated 
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update messages they received" ON messages FOR UPDATE TO authenticated 
  USING (receiver_id = auth.uid()) 
  WITH CHECK (receiver_id = auth.uid());

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT TO authenticated 
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON notifications FOR INSERT TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE TO authenticated 
  USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications" ON notifications FOR DELETE TO authenticated 
  USING (user_id = auth.uid());

-- Create update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_comments_updated_at BEFORE UPDATE ON task_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();