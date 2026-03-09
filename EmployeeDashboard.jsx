import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ClipboardList, CheckCircle, Clock, XCircle } from 'lucide-react';
import { EmployeeTaskList } from './EmployeeTaskList';

export const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    pendingTasks: 0,
    acceptedTasks: 0,
    completedTasks: 0,
    rejectedTasks: 0,
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    loadStats();
  }, [user, refreshTrigger]);

  const loadStats = async () => {
    if (!user) return;

    const { data: assignments } = await supabase
      .from('task_assignments')
      .select('status, individual_status')
      .eq('employee_id', user.id);

    const pendingTasks = assignments?.filter(a => a.status === 'pending').length || 0;
    const acceptedTasks = assignments?.filter(a => a.status === 'accepted' && a.individual_status !== 'completed').length || 0;
    const completedTasks = assignments?.filter(a => a.individual_status === 'completed').length || 0;
    const rejectedTasks = assignments?.filter(a => a.status === 'rejected').length || 0;

    setStats({
      pendingTasks,
      acceptedTasks,
      completedTasks,
      rejectedTasks,
    });
  };

  const handleUpdate = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Employee Dashboard</h1>
        <p className="text-gray-600 mt-1">Manage your assigned tasks and track your progress</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Pending Tasks</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.pendingTasks}</p>
            </div>
            <Clock className="h-10 w-10 text-amber-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Active Tasks</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.acceptedTasks}</p>
            </div>
            <ClipboardList className="h-10 w-10 text-blue-500" />
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
              <p className="text-gray-600 text-sm font-medium">Rejected</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.rejectedTasks}</p>
            </div>
            <XCircle className="h-10 w-10 text-red-500" />
          </div>
        </div>
      </div>

      <EmployeeTaskList refreshTrigger={refreshTrigger} onUpdate={handleUpdate} />
    </div>
  );
};