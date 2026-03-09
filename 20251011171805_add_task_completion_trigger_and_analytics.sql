/*
  # Add Task Completion Tracking and Analytics Support

  ## Changes
  1. Create trigger to auto-update task status when all assignments are completed
  2. Add completed_at timestamp to tasks table
  3. Add indexes for analytics queries
  4. Track on-time vs late completions
*/

-- Add completed_at column to tasks if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE tasks ADD COLUMN completed_at timestamptz;
  END IF;
END $$;

-- Function to update task status based on assignments
CREATE OR REPLACE FUNCTION update_task_status()
RETURNS TRIGGER AS $$
DECLARE
  task_assignment_count INTEGER;
  completed_assignment_count INTEGER;
  task_status_value TEXT;
BEGIN
  -- Get total assignments for this task
  SELECT COUNT(*) INTO task_assignment_count
  FROM task_assignments
  WHERE task_id = NEW.task_id AND status = 'accepted';

  -- Get completed assignments
  SELECT COUNT(*) INTO completed_assignment_count
  FROM task_assignments
  WHERE task_id = NEW.task_id 
    AND status = 'accepted' 
    AND individual_status = 'completed';

  -- Determine task status
  IF completed_assignment_count = 0 THEN
    task_status_value := 'pending';
  ELSIF completed_assignment_count = task_assignment_count AND task_assignment_count > 0 THEN
    task_status_value := 'completed';
    
    -- Update task with completed status and timestamp
    UPDATE tasks
    SET status = task_status_value,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = NEW.task_id;
    
    RETURN NEW;
  ELSE
    task_status_value := 'in_progress';
  END IF;

  -- Update task status without completed_at
  UPDATE tasks
  SET status = task_status_value,
        updated_at = NOW()
  WHERE id = NEW.task_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS task_assignment_status_trigger ON task_assignments;

-- Create trigger on task_assignments
CREATE TRIGGER task_assignment_status_trigger
AFTER INSERT OR UPDATE ON task_assignments
FOR EACH ROW
EXECUTE FUNCTION update_task_status();

-- Add indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON tasks(completed_at);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_task_assignments_completed_at ON task_assignments(completed_at);
CREATE INDEX IF NOT EXISTS idx_task_assignments_individual_status ON task_assignments(individual_status);