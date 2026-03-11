import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Send, Trash2 } from 'lucide-react';

export const TaskComments = ({ taskId }) => {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadComments();

    const subscription = supabase
      .channel(`comments-${taskId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'task_comments',
        filter: `task_id=eq.${taskId}`
      }, () => {
        loadComments();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [taskId]);

  const loadComments = async () => {
    const { data } = await supabase
      .from('task_comments')
      .select(`
        *,
        user:profiles!task_comments_user_id_fkey(full_name, role)
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (data) setComments(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setLoading(true);

    await supabase.from('task_comments').insert({
      task_id: taskId,
      user_id: user.id,
      comment_text: newComment,
      is_feedback: profile?.role === 'employer',
    });

    setNewComment('');
    setLoading(false);
  };

  const handleDelete = async (commentId) => {
    await supabase
      .from('task_comments')
      .delete()
      .eq('id', commentId);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No comments yet</p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className={`p-4 rounded-lg ${
                comment.is_feedback
                  ? 'bg-blue-50 border border-blue-200'
                  : 'bg-gray-50 border border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-semibold text-gray-900">{comment.user.full_name}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {comment.user.role.charAt(0).toUpperCase() + comment.user.role.slice(1)}
                    </span>
                    {comment.is_feedback && (
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                        Feedback
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {new Date(comment.created_at).toLocaleString()}
                  </span>
                  {comment.user_id === user?.id && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="text-red-600 hover:text-red-700 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-gray-900 whitespace-pre-wrap">{comment.comment_text}</p>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={loading || !newComment.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="h-4 w-4" />
          Send
        </button>
      </form>
    </div>
  );
};
