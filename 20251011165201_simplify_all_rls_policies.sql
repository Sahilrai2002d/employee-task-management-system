/*
  # Simplify All RLS Policies - Remove All Recursion

  ## Changes
  - Remove all complex subqueries
  - Use only direct column comparisons
  - No joins or subqueries in policies
*/

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view their tasks" ON tasks;
DROP POLICY IF EXISTS "Authenticated users can create tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update their created tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete their created tasks" ON tasks;

DROP POLICY IF EXISTS "View own assignments or created assignments" ON task_assignments;
DROP POLICY IF EXISTS "Create assignments for own tasks" ON task_assignments;
DROP POLICY IF EXISTS "Update own assignments" ON task_assignments;

DROP POLICY IF EXISTS "View work logs for own assignments or assigned tasks" ON work_logs;
DROP POLICY IF EXISTS "Create work logs for own assignments" ON work_logs;

DROP POLICY IF EXISTS "View comments on accessible tasks" ON task_comments;
DROP POLICY IF EXISTS "Create comments on accessible tasks" ON task_comments;
DROP POLICY IF EXISTS "Users can update own comments" ON task_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON task_comments;

DROP POLICY IF EXISTS "View files on accessible tasks" ON task_files;
DROP POLICY IF EXISTS "Upload files to accessible tasks" ON task_files;
DROP POLICY IF EXISTS "Users can delete own files" ON task_files;

DROP POLICY IF EXISTS "Users can view their messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update messages they received" ON messages;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;

-- SIMPLE TASKS POLICIES (no subqueries)
CREATE POLICY "Anyone authenticated can view all tasks" 
  ON tasks FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Anyone authenticated can create tasks" 
  ON tasks FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Task creators can update" 
  ON tasks FOR UPDATE 
  TO authenticated 
  USING (created_by = auth.uid());

CREATE POLICY "Task creators can delete" 
  ON tasks FOR DELETE 
  TO authenticated 
  USING (created_by = auth.uid());

-- SIMPLE TASK_ASSIGNMENTS POLICIES
CREATE POLICY "Anyone authenticated can view assignments" 
  ON task_assignments FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Anyone authenticated can create assignments" 
  ON task_assignments FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Employees can update their assignments" 
  ON task_assignments FOR UPDATE 
  TO authenticated 
  USING (employee_id = auth.uid());

-- SIMPLE WORK_LOGS POLICIES
CREATE POLICY "Anyone authenticated can view work logs" 
  ON work_logs FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Employees can create their work logs" 
  ON work_logs FOR INSERT 
  TO authenticated 
  WITH CHECK (employee_id = auth.uid());

-- SIMPLE TASK_COMMENTS POLICIES
CREATE POLICY "Anyone authenticated can view comments" 
  ON task_comments FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Anyone authenticated can create comments" 
  ON task_comments FOR INSERT 
  TO authenticated 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own comments" 
  ON task_comments FOR UPDATE 
  TO authenticated 
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own comments" 
  ON task_comments FOR DELETE 
  TO authenticated 
  USING (user_id = auth.uid());

-- SIMPLE TASK_FILES POLICIES
CREATE POLICY "Anyone authenticated can view files" 
  ON task_files FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Anyone authenticated can upload files" 
  ON task_files FOR INSERT 
  TO authenticated 
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Users can delete own files" 
  ON task_files FOR DELETE 
  TO authenticated 
  USING (uploaded_by = auth.uid());

-- SIMPLE MESSAGES POLICIES
CREATE POLICY "View own messages" 
  ON messages FOR SELECT 
  TO authenticated 
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Send messages" 
  ON messages FOR INSERT 
  TO authenticated 
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Update received messages" 
  ON messages FOR UPDATE 
  TO authenticated 
  USING (receiver_id = auth.uid());

-- SIMPLE NOTIFICATIONS POLICIES
CREATE POLICY "View own notifications" 
  ON notifications FOR SELECT 
  TO authenticated 
  USING (user_id = auth.uid());

CREATE POLICY "Create any notifications" 
  ON notifications FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Update own notifications" 
  ON notifications FOR UPDATE 
  TO authenticated 
  USING (user_id = auth.uid());

CREATE POLICY "Delete own notifications" 
  ON notifications FOR DELETE 
  TO authenticated 
  USING (user_id = auth.uid());