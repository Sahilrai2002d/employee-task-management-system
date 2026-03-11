import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, Users, AlertCircle, Eye } from 'lucide-react';
import { TaskDetailModal } from './TaskDetailModal';

export const TaskList = ({ refreshTrigger }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadTasks();

    const channel = supabase
      .channel('task-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        () => {
          setTimeout(() => loadTasks(), 100);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_assignments',
        },
        () => {
          setTimeout(() => loadTasks(), 100);
        }
      )
      .subscribe();

    const pollInterval = setInterval(() => {
      loadTasks();
    }, 2000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [user, refreshTrigger, filter]);

  const loadTasks = async () => {
    if (!user) return;

    let query = supabase
      .from('tasks')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data: tasksData, error } = await query;

    if (error) {
      console.error('Error loading tasks:', error);
      return;
    }

    if (tasksData) {
      const tasksWithCounts = await Promise.all(
        tasksData.map(async (task) => {
          const { data: assignments, error: assignmentError } = await supabase
            .from('task_assignments')
            .select('status, individual_status')
            .eq('task_id', task.id);

          if (assignmentError) {
            console.error('Error loading assignments:', assignmentError);
            return {
              ...task,
              assignmentCount: 0,
              acceptedCount: 0,
              completedCount: 0,
            };
          }

          return {
            ...task,
            assignmentCount: assignments?.length || 0,
            acceptedCount: assignments?.filter(a => a.status === 'accepted').length || 0,
            completedCount: assignments?.filter(a => a.individual_status === 'completed').length || 0,
          };
        })
      );

      setTasks(tasksWithCounts);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">All Tasks</h2>
          <div className="flex gap-2">
            {['all', 'pending', 'in_progress', 'completed'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'All' : status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="divide-y">
        {tasks.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No tasks found</p>
            <p className="text-sm text-gray-400 mt-1">Create your first task to get started</p>
          </div>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-start gap-3">
                    <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                      {task.priority.toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
                      {task.status.replace('_', ' ').toUpperCase()}
                    </span>
                    {task.is_group_task && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        GROUP
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 mt-2 line-clamp-2">{task.description}</p>

                  <div className="flex items-center gap-6 mt-4 text-sm text-gray-500">
                    {task.deadline && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(task.deadline).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>
                        {task.acceptedCount}/{task.assignmentCount} accepted
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>
                        {task.completedCount}/{task.assignmentCount} completed
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedTask(task)}
                  className="ml-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  View Details
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={loadTasks}
        />
      )}
    </div>
  );
};
