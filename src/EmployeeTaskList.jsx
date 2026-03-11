import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, AlertCircle, Eye, Users } from 'lucide-react';
import { EmployeeTaskDetailModal } from './EmployeeTaskDetailModal';

export const EmployeeTaskList = ({ refreshTrigger, onUpdate }) => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadAssignments();
  }, [user, refreshTrigger, filter]);

  const loadAssignments = async () => {
    if (!user) return;

    let query = supabase
      .from('task_assignments')
      .select(`
        *,
        task:tasks(*)
      `)
      .eq('employee_id', user.id)
      .order('assigned_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data } = await query;

    if (data) {
      const assignmentsWithCounts = await Promise.all(
        data.map(async (assignment) => {
          const { data: allAssignments } = await supabase
            .from('task_assignments')
            .select('id')
            .eq('task_id', assignment.task.id);

          return {
            ...assignment,
            assignmentCount: allAssignments?.length || 0,
          };
        })
      );

      setAssignments(assignmentsWithCounts);
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

  const handleTaskUpdate = () => {
    loadAssignments();
    onUpdate();
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">My Tasks</h2>
          <div className="flex gap-2">
            {['all', 'pending', 'accepted', 'rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="divide-y">
        {assignments.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No tasks found</p>
            <p className="text-sm text-gray-400 mt-1">Tasks assigned to you will appear here</p>
          </div>
        ) : (
          assignments.map((assignment) => (
            <div key={assignment.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-start gap-3">
                    <h3 className="text-lg font-semibold text-gray-900">{assignment.task.title}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(assignment.task.priority)}`}>
                      {assignment.task.priority.toUpperCase()}
                    </span>
                    {assignment.task.is_group_task && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        GROUP ({assignment.assignmentCount})
                      </span>
                    )}
                  </div>

                  <p className="text-gray-600 mt-2 line-clamp-2">{assignment.task.description}</p>

                  <div className="flex items-center gap-6 mt-4 text-sm">
                    {assignment.task.deadline && (
                      <div className="flex items-center gap-1 text-gray-500">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(assignment.task.deadline).toLocaleDateString()}</span>
                      </div>
                    )}

                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      assignment.status === 'accepted' ? 'bg-green-100 text-green-800' :
                      assignment.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {assignment.status.toUpperCase()}
                    </span>

                    {assignment.status === 'accepted' && (
                      <>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          assignment.individual_status === 'completed' ? 'bg-green-100 text-green-800' :
                          assignment.individual_status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {assignment.individual_status.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="text-gray-700 font-medium">
                          {assignment.progress_percentage}% Complete
                        </span>
                      </>
                    )}
                  </div>

                  {assignment.status === 'accepted' && (
                    <div className="mt-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${assignment.progress_percentage}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setSelectedAssignment(assignment)}
                  className="ml-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  View
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedAssignment && (
        <EmployeeTaskDetailModal
          assignment={selectedAssignment}
          onClose={() => setSelectedAssignment(null)}
          onUpdate={handleTaskUpdate}
        />
      )}
    </div>
  );
};
