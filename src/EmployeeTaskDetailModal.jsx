import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { X, Check, XIcon, Plus, MessageSquare, Users } from 'lucide-react';
import { TaskComments } from '../Shared/TaskComments';

export const EmployeeTaskDetailModal = ({ assignment, onClose, onUpdate }) => {
  const { user } = useAuth();
  const [workLogs, setWorkLogs] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [showAddLog, setShowAddLog] = useState(false);
  const [logDescription, setLogDescription] = useState('');
  const [hoursWorked, setHoursWorked] = useState('');
  const [progressUpdate, setProgressUpdate] = useState('');
  const [individualStatus, setIndividualStatus] = useState(assignment.individual_status);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadWorkLogs();
    if (assignment.task.is_group_task) {
      loadTeamMembers();
    }
  }, [assignment.id]);

  const loadWorkLogs = async () => {
    const { data } = await supabase
      .from('work_logs')
      .select('*')
      .eq('assignment_id', assignment.id)
      .order('created_at', { ascending: false });

    if (data) setWorkLogs(data);
  };

  const loadTeamMembers = async () => {
    const { data } = await supabase
      .from('task_assignments')
      .select(`
        id,
        progress_percentage,
        individual_status,
        employee:profiles!task_assignments_employee_id_fkey(full_name, email)
      `)
      .eq('task_id', assignment.task.id)
      .eq('status', 'accepted');

    if (data) setTeamMembers(data);
  };

  const handleAccept = async () => {
    setLoading(true);
    await supabase
      .from('task_assignments')
      .update({
        status: 'accepted',
        responded_at: new Date().toISOString()
      })
      .eq('id', assignment.id);

    await supabase.from('notifications').insert({
      user_id: assignment.task.created_by,
      type: 'task_accepted',
      title: 'Task Accepted',
      message: `Task "${assignment.task.title}" has been accepted`,
      related_task_id: assignment.task.id,
    });

    onUpdate();
    setLoading(false);
  };

  const handleReject = async () => {
    setLoading(true);
    await supabase
      .from('task_assignments')
      .update({
        status: 'rejected',
        responded_at: new Date().toISOString()
      })
      .eq('id', assignment.id);

    await supabase.from('notifications').insert({
      user_id: assignment.task.created_by,
      type: 'task_rejected',
      title: 'Task Rejected',
      message: `Task "${assignment.task.title}" has been rejected`,
      related_task_id: assignment.task.id,
    });

    onUpdate();
    setLoading(false);
  };

  const handleAddWorkLog = async (e) => {
    e.preventDefault();
    setLoading(true);

    const newProgress = progressUpdate ? parseInt(progressUpdate) : assignment.progress_percentage;

    await supabase.from('work_logs').insert({
      assignment_id: assignment.id,
      employee_id: user.id,
      description: logDescription,
      hours_worked: hoursWorked ? parseFloat(hoursWorked) : null,
      progress_update: progressUpdate ? parseInt(progressUpdate) : null,
    });

    await supabase
      .from('task_assignments')
      .update({
        progress_percentage: newProgress,
        individual_status: individualStatus,
      })
      .eq('id', assignment.id);

    setLogDescription('');
    setHoursWorked('');
    setProgressUpdate('');
    setShowAddLog(false);
    loadWorkLogs();
    onUpdate();
    setLoading(false);
  };

  const getOverallProgress = () => {
    if (!teamMembers.length) return 0;
    const total = teamMembers.reduce((sum, member) => sum + member.progress_percentage, 0);
    return Math.round(total / teamMembers.length);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{assignment.task.title}</h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm px-2 py-1 bg-blue-100 text-blue-800 rounded">
                {assignment.task.priority.toUpperCase()}
              </span>
              <span className={`text-sm px-2 py-1 rounded ${
                assignment.status === 'accepted' ? 'bg-green-100 text-green-800' :
                assignment.status === 'rejected' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {assignment.status.toUpperCase()}
              </span>
              {assignment.task.is_group_task && (
                <span className="text-sm px-2 py-1 bg-blue-100 text-blue-800 rounded">
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
          {assignment.status === 'pending' && (
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-amber-900 mb-4">This task is waiting for your response. Do you want to accept or reject it?</p>
              <div className="flex gap-3">
                <button
                  onClick={handleAccept}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  Accept Task
                </button>
                <button
                  onClick={handleReject}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  <XIcon className="h-4 w-4" />
                  Reject Task
                </button>
              </div>
            </div>
          )}

          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
            <p className="text-gray-900">{assignment.task.description}</p>
          </div>

          {assignment.task.deadline && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Deadline</h3>
              <p className="text-gray-900">{new Date(assignment.task.deadline).toLocaleString()}</p>
            </div>
          )}

          {assignment.status === 'accepted' && (
            <>
              <div className="border-b mb-6">
                <div className="flex gap-4">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`pb-3 px-4 font-medium border-b-2 transition-colors ${
                      activeTab === 'overview'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Overview
                  </button>
                  {assignment.task.is_group_task && (
                    <button
                      onClick={() => setActiveTab('team')}
                      className={`pb-3 px-4 font-medium border-b-2 transition-colors ${
                        activeTab === 'team'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Team ({teamMembers.length})
                      </div>
                    </button>
                  )}
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

              {activeTab === 'overview' && (
                <>
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-sm font-medium text-gray-700">Your Progress</h3>
                      <span className="text-2xl font-bold text-gray-900">{assignment.progress_percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-blue-600 h-3 rounded-full transition-all"
                        style={{ width: `${assignment.progress_percentage}%` }}
                      />
                    </div>
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <select
                        value={individualStatus}
                        onChange={(e) => setIndividualStatus(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="not_started">Not Started</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Work Logs</h3>
                      <button
                        onClick={() => setShowAddLog(!showAddLog)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        <Plus className="h-4 w-4" />
                        Add Log
                      </button>
                    </div>

                    {showAddLog && (
                      <form onSubmit={handleAddWorkLog} className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Description
                            </label>
                            <textarea
                              value={logDescription}
                              onChange={(e) => setLogDescription(e.target.value)}
                              required
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                              placeholder="Describe what you accomplished"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Hours Worked (Optional)
                              </label>
                              <input
                                type="number"
                                step="0.5"
                                value={hoursWorked}
                                onChange={(e) => setHoursWorked(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                placeholder="2.5"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Progress % (Optional)
                              </label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={progressUpdate}
                                onChange={(e) => setProgressUpdate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                placeholder="75"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              disabled={loading}
                              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                              Save Log
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowAddLog(false)}
                              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </form>
                    )}

                    <div className="space-y-3">
                      {workLogs.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No work logs yet</p>
                      ) : (
                        workLogs.map((log) => (
                          <div key={log.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-gray-900 mb-2">{log.description}</p>
                            <div className="flex gap-4 text-sm text-gray-500">
                              {log.hours_worked && <span>{log.hours_worked} hours</span>}
                              {log.progress_update && <span>Progress: {log.progress_update}%</span>}
                              <span>{new Date(log.created_at).toLocaleString()}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'team' && assignment.task.is_group_task && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-blue-900">Overall Team Progress</span>
                      <span className="text-2xl font-bold text-blue-900">{getOverallProgress()}%</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-3 mt-2">
                      <div
                        className="bg-blue-600 h-3 rounded-full transition-all"
                        style={{ width: `${getOverallProgress()}%` }}
                      />
                    </div>
                  </div>

                  {teamMembers.map((member) => (
                    <div key={member.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold text-gray-900">{member.employee.full_name}</p>
                          <p className="text-sm text-gray-500">{member.employee.email}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          member.individual_status === 'completed' ? 'bg-green-100 text-green-800' :
                          member.individual_status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {member.individual_status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${member.progress_percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{member.progress_percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'comments' && (
                <TaskComments taskId={assignment.task.id} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
