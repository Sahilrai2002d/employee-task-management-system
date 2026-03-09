import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Users, CheckCircle, Clock, AlertCircle, BarChart3 } from 'lucide-react';
import { CreateTaskModal } from './CreateTaskModal';
import { TaskList } from './TaskList';
import { EmployeeAnalytics } from './EmployeeAnalytics';

export const EmployerDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalTasks: 0,
    activeTasks: 0,
    completedTasks: 0,
    pendingAcceptance: 0,
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeView, setActiveView] = useState('tasks');

  useEffect(() => {
    loadStats();

    const channel = supabase
      .channel('dashboard-stats')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        () => {
          setTimeout(() => loadStats(), 100);
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
          setTimeout(() => loadStats(), 100);
        }
      )
      .subscribe();

    const pollInterval = setInterval(() => {
      loadStats();
    }, 2000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [user, refreshTrigger]);

  const loadStats = async () => {
    if (!user) return;

    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, status')
      .eq('created_by', user.id);

    const { data: assignments } = await supabase
      .from('task_assignments')
      .select('status')
      .eq('assigned_by', user.id);

    const totalTasks = tasks?.length || 0;
    const activeTasks = tasks?.filter(t => t.status === 'in_progress').length || 0;
    const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0;
    const pendingAcceptance = assignments?.filter(a => a.status === 'pending').length || 0;

    setStats({
      totalTasks,
      activeTasks,
      completedTasks,
      pendingAcceptance,
    });
  };

  const handleTaskCreated = () => {
    setRefreshTrigger(prev => prev + 1);
    setShowCreateModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Employer Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage and monitor your team's tasks</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
        >
          <Plus className="h-5 w-5" />
          Create Task
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Tasks</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalTasks}</p>
            </div>
            <Users className="h-10 w-10 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Active Tasks</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.activeTasks}</p>
            </div>
            <Clock className="h-10 w-10 text-amber-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Completed</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.completedTasks}</p>
            </div>
            <CheckCircle className="h-10 w-10 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Pending Acceptance</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.pendingAcceptance}</p>
            </div>
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
        </div>
      </div>

      <div className="mb-6 bg-white rounded-lg shadow-md p-2 inline-flex gap-2">
        <button
          onClick={() => setActiveView('tasks')}
          className={`flex items-center gap-2 px-6 py-3 rounded-md font-medium transition-colors ${
            activeView === 'tasks'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Users className="h-5 w-5" />
          Tasks
        </button>
        <button
          onClick={() => setActiveView('analytics')}
          className={`flex items-center gap-2 px-6 py-3 rounded-md font-medium transition-colors ${
            activeView === 'analytics'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <BarChart3 className="h-5 w-5" />
          Analytics
        </button>
      </div>

      {activeView === 'tasks' ? (
        <TaskList refreshTrigger={refreshTrigger} />
      ) : (
        <EmployeeAnalytics />
      )}

      {showCreateModal && (
        <CreateTaskModal
          onClose={() => setShowCreateModal(false)}
          onTaskCreated={handleTaskCreated}
        />
      )}
    </div>
  );
};