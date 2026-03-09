import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { TrendingUp, Calendar, Award, Clock } from 'lucide-react';

export const EmployeeAnalytics = () => {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState('month');
  const [employeeStats, setEmployeeStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [overallStats, setOverallStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    onTimeRate: 0,
    avgCompletionTime: 0,
  });

  useEffect(() => {
    loadAnalytics();
  }, [user, timeRange]);

  const getDateRange = () => {
    const now = new Date();
    let startDate = new Date();

    if (timeRange === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (timeRange === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else if (timeRange === 'quarter') {
      startDate.setMonth(now.getMonth() - 3);
    }

    return startDate.toISOString();
  };

  const loadAnalytics = async () => {
    if (!user) return;
    setLoading(true);

    const startDate = getDateRange();

    const { data: tasks } = await supabase
      .from('tasks')
      .select(`
        id,
        created_at,
        completed_at,
        deadline,
        status,
        task_assignments (
          id,
          employee_id,
          individual_status,
          completed_at,
          progress_percentage,
          employee:profiles!task_assignments_employee_id_fkey (
            id,
            full_name,
            email
          )
        )
      `)
      .eq('created_by', user.id)
      .gte('created_at', startDate);

    if (!tasks) {
      setLoading(false);
      return;
    }

    const employeeMap = new Map();
    let totalTasksCount = 0;
    let completedTasksCount = 0;
    let onTimeCount = 0;

    tasks.forEach((task) => {
      task.task_assignments?.forEach((assignment) => {
        const empId = assignment.employee.id;

        if (!employeeMap.has(empId)) {
          employeeMap.set(empId, {
            id: empId,
            full_name: assignment.employee.full_name,
            email: assignment.employee.email,
            total_tasks: 0,
            completed_tasks: 0,
            on_time_completions: 0,
            late_completions: 0,
            completion_rate: 0,
            avg_progress: 0,
          });
        }

        const stats = employeeMap.get(empId);
        stats.total_tasks++;
        totalTasksCount++;

        if (assignment.individual_status === 'completed') {
          stats.completed_tasks++;
          completedTasksCount++;

          if (task.deadline && assignment.completed_at) {
            const completedDate = new Date(assignment.completed_at);
            const deadlineDate = new Date(task.deadline);

            if (completedDate <= deadlineDate) {
              stats.on_time_completions++;
              onTimeCount++;
            } else {
              stats.late_completions++;
            }
          }
        }
      });
    });

    const statsArray = Array.from(employeeMap.values()).map((stat) => {
      const { data: assignments } = supabase
        .from('task_assignments')
        .select('progress_percentage')
        .eq('employee_id', stat.id);

      return {
        ...stat,
        completion_rate: stat.total_tasks > 0
          ? Math.round((stat.completed_tasks / stat.total_tasks) * 100)
          : 0,
        avg_progress: 0,
      };
    });

    for (const stat of statsArray) {
      const { data: assignments } = await supabase
        .from('task_assignments')
        .select('progress_percentage')
        .eq('employee_id', stat.id);

      if (assignments && assignments.length > 0) {
        const totalProgress = assignments.reduce((sum, a) => sum + (a.progress_percentage || 0), 0);
        stat.avg_progress = Math.round(totalProgress / assignments.length);
      }
    }

    statsArray.sort((a, b) => b.completed_tasks - a.completed_tasks);

    setEmployeeStats(statsArray);
    setOverallStats({
      totalTasks: totalTasksCount,
      completedTasks: completedTasksCount,
      onTimeRate: totalTasksCount > 0 ? Math.round((onTimeCount / completedTasksCount) * 100) : 0,
      avgCompletionTime: 0,
    });
    setLoading(false);
  };

  const getTimeRangeLabel = () => {
    if (timeRange === 'week') return 'Last 7 Days';
    if (timeRange === 'month') return 'Last 30 Days';
    if (timeRange === 'quarter') return 'Last 90 Days';
    return '';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Employee Analytics</h2>
          <p className="text-gray-600 text-sm mt-1">Performance metrics and completion rates</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTimeRange('week')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              timeRange === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              timeRange === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setTimeRange('quarter')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              timeRange === 'quarter'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Quarter
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-blue-900 font-medium">Total Tasks</p>
              <p className="text-2xl font-bold text-blue-900">{overallStats.totalTasks}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-600 rounded-lg">
              <Award className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-green-900 font-medium">Completed</p>
              <p className="text-2xl font-bold text-green-900">{overallStats.completedTasks}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600 rounded-lg">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-purple-900 font-medium">On-Time Rate</p>
              <p className="text-2xl font-bold text-purple-900">{overallStats.onTimeRate}%</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-600 rounded-lg">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-orange-900 font-medium">Completion Rate</p>
              <p className="text-2xl font-bold text-orange-900">
                {overallStats.totalTasks > 0
                  ? Math.round((overallStats.completedTasks / overallStats.totalTasks) * 100)
                  : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Employee Performance - {getTimeRangeLabel()}
        </h3>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-2">Loading analytics...</p>
        </div>
      ) : employeeStats.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No data available for the selected time range</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Employee</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Total Tasks</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Completed</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">On Time</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Late</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Completion Rate</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Avg Progress</th>
              </tr>
            </thead>
            <tbody>
              {employeeStats.map((stat) => (
                <tr key={stat.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-4">
                    <div>
                      <p className="font-medium text-gray-900">{stat.full_name}</p>
                      <p className="text-sm text-gray-500">{stat.email}</p>
                    </div>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-800 rounded-full font-semibold">
                      {stat.total_tasks}
                    </span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center justify-center w-10 h-10 bg-green-100 text-green-800 rounded-full font-semibold">
                      {stat.completed_tasks}
                    </span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center justify-center w-10 h-10 bg-emerald-100 text-emerald-800 rounded-full font-semibold">
                      {stat.on_time_completions}
                    </span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className="inline-flex items-center justify-center w-10 h-10 bg-red-100 text-red-800 rounded-full font-semibold">
                      {stat.late_completions}
                    </span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${stat.completion_rate}%` }}
                        />
                      </div>
                      <span className="font-semibold text-gray-900 w-12 text-right">
                        {stat.completion_rate}%
                      </span>
                    </div>
                  </td>
                  <td className="text-center py-4 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all"
                          style={{ width: `${stat.avg_progress}%` }}
                        />
                      </div>
                      <span className="font-semibold text-gray-900 w-12 text-right">
                        {stat.avg_progress}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};