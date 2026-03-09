/*
  # Update Task Status From Assignments

  ## Changes
  - Create a function to update task statuses based on completed assignments
  - Trigger this function to ensure task status reflects assignment completion
*/

CREATE OR REPLACE FUNCTION sync_task_status_from_assignments()
RETURNS void AS $$
BEGIN
  -- Update tasks to completed if all non-rejected assignments are completed
  UPDATE tasks t
  SET 
    status = 'completed',
    completed_at = NOW(),
    updated_at = NOW()
  WHERE t.status != 'completed'
    AND EXISTS (
      SELECT 1 FROM task_assignments ta
      WHERE ta.task_id = t.id
        AND ta.status != 'rejected'
      GROUP BY ta.task_id
      HAVING COUNT(*) = COUNT(CASE WHEN ta.individual_status = 'completed' THEN 1 END)
        AND COUNT(*) > 0
    );

  -- Update tasks to in_progress if at least one assignment is accepted or in progress
  UPDATE tasks t
  SET 
    status = 'in_progress',
    updated_at = NOW()
  WHERE t.status NOT IN ('completed', 'in_progress')
    AND EXISTS (
      SELECT 1 FROM task_assignments ta
      WHERE ta.task_id = t.id
        AND (ta.status = 'accepted' OR ta.individual_status IN ('in_progress', 'completed'))
    );
END;
$$ LANGUAGE plpgsql;

-- Run the sync immediately
SELECT sync_task_status_from_assignments();

-- Create or replace the trigger function to call sync on every change
DROP TRIGGER IF EXISTS sync_task_status_trigger ON task_assignments;
DROP FUNCTION IF EXISTS trigger_sync_task_status();

CREATE OR REPLACE FUNCTION trigger_sync_task_status()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM sync_task_status_from_assignments();
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_task_status_trigger
AFTER INSERT OR UPDATE OR DELETE ON task_assignments
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_sync_task_status();