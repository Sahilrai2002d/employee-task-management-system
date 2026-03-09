import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, User, CheckCircle, Clock, XCircle, MessageSquare } from 'lucide-react';
import { TaskComments } from '../Shared/TaskComments';

export const TaskDetailModal = ({ task, onClose, onUpdate }) => {
  const [assignments, setAssignments] = useState([]);
  const [activeTab, setActiveTab] = useState('assignments');

  useEffect(() => {
    loadAssignments();
  }, [task.id]);

  const loadAssignments = async () => {
    const { data } = await supabase
      .from('task_assignments')
      .select(`
        *,
        employee:profiles!task_assignments_employee_id_fkey(full_name, email),
        work_logs(description, hours_worked, created_at)
      `)
      .eq('task_id', task.id)
      .order('created_at');

    if (data) {
      setAssignments(data);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'accepted': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'rejected': return <XCircle className="h-5 w-5 text-red-600" />;
      default: return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{task.title}</h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm px-2 py-1 bg-blue-100 text-blue-800 rounded">
                {task.priority.toUpperCase()}
              </span>
              <span className="text-sm px-2 py-1 bg-gray-100 text-gray-800 rounded">
                {task.status.replace('_', ' ').toUpperCase()}
              </span>
              {task.is_group_task && (
                <span className="text-sm px-2 py-1 bg-green-100 text-green-800 rounded">
                  GROUP TASK
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
            <p className="text-gray-900">{task.description}</p>
          </div>

          {task.deadline && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Deadline</h3>
              <p className="text-gray-900">{new Date(task.deadline).toLocaleString()}</p>
            </div>
          )}

          <div className="border-b mb-6">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('assignments')}
                className={`pb-3 px-4 font-medium border-b-2 transition-colors ${
                  activeTab === 'assignments'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Assignments ({assignments.length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('comments')}
                className={`pb-3 px-4 font-medium border-b-2 transition-colors ${
                  activeTab === 'comments'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Comments
                </div>
              </button>
            </div>
          </div>

          {activeTab === 'assignments' ? (
            <div className="space-y-4">
              {assignments.map((assignment) => (
                <div key={assignment.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(assignment.status)}
                      <div>
                        <p className="font-semibold text-gray-900">{assignment.employee.full_name}</p>
                        <p className="text-sm text-gray-500">{assignment.employee.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-1 rounded ${
                        assignment.status === 'accepted' ? 'bg-green-100 text-green-800' :
                        assignment.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {assignment.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {assignment.status === 'accepted' && (
                    <>
                      <div className="mb-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-gray-700">Progress</span>
                          <span className="text-sm font-semibold text-gray-900">
                            {assignment.progress_percentage}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${assignment.progress_percentage}%` }}
                          />
                        </div>
                      </div>

                      <div className="text-sm">
                        <span className={`px-2 py-1 rounded ${
                          assignment.individual_status === 'completed' ? 'bg-green-100 text-green-800' :
                          assignment.individual_status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {assignment.individual_status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>

                      {assignment.work_logs && assignment.work_logs.length > 0 && (
                        <div className="mt-4 border-t pt-3">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Work Logs</h4>
                          <div className="space-y-2">
                            {assignment.work_logs.map((log, idx) => (
                              <div key={idx} className="bg-gray-50 p-3 rounded text-sm">
                                <p className="text-gray-900">{log.description}</p>
                                <div className="flex gap-4 mt-1 text-xs text-gray-500">
                                  {log.hours_worked && <span>{log.hours_worked} hours</span>}
                                  <span>{new Date(log.created_at).toLocaleString()}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <TaskComments taskId={task.id} />
          )}
        </div>
      </div>
    </div>
  );
};