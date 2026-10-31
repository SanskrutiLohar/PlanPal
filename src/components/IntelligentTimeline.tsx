import React, { useState } from 'react';
import { TimelineTask, EventFormData } from '../types/plan.js';

interface IntelligentTimelineProps {
  tasks: TimelineTask[];
  formData: EventFormData;
  onUpdateTasks: (tasks: TimelineTask[]) => void;
}

const getTodayIST = () => {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
};

export const IntelligentTimeline: React.FC<IntelligentTimelineProps> = ({
  tasks,
  formData,
  onUpdateTasks,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'overdue' | 'completed'>('all');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);

  // Form State
  const [taskTitle, setTaskTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [whenLabel, setWhenLabel] = useState<string>('2 weeks before');
  const [dueDate, setDueDate] = useState<string>('');
  const [category, setCategory] = useState<TimelineTask['category']>('General');
  const [priority, setPriority] = useState<TimelineTask['priority']>('Normal');

  const todayStr = getTodayIST();

  const handleToggleTask = (id: string) => {
    const updated = tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
    onUpdateTasks(updated);
  };

  const handleOpenAdd = () => {
    setTaskTitle('');
    setDescription('');
    setWhenLabel('2 weeks before');
    setDueDate('');
    setCategory('General');
    setPriority('Normal');
    setEditingTaskId(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (t: TimelineTask) => {
    setTaskTitle(t.task);
    setDescription(t.description || '');
    setWhenLabel(t.when);
    setDueDate(t.dueDate || '');
    setCategory(t.category);
    setPriority(t.priority);
    setEditingTaskId(t.id);
    setShowAddModal(true);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    if (editingTaskId) {
      const updated = tasks.map((t) => {
        if (t.id === editingTaskId) {
          return {
            ...t,
            task: taskTitle.trim(),
            description: description.trim() || undefined,
            when: whenLabel.trim() || 'Scheduled',
            dueDate: dueDate || undefined,
            category,
            priority,
          };
        }
        return t;
      });
      onUpdateTasks(updated);
    } else {
      const newTask: TimelineTask = {
        id: 'task_' + Date.now(),
        task: taskTitle.trim(),
        description: description.trim() || undefined,
        when: whenLabel.trim() || 'Custom milestone',
        dueDate: dueDate || undefined,
        category,
        priority,
        completed: false,
      };
      onUpdateTasks([...tasks, newTask]);
    }

    setShowAddModal(false);
    setEditingTaskId(null);
  };

  const handleDeleteTask = (id: string) => {
    onUpdateTasks(tasks.filter((t) => t.id !== id));
  };

  const handleRegenerateTimeline = async () => {
    setIsRegenerating(true);
    try {
      const res = await fetch('/api/timeline-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.tasks)) {
          onUpdateTasks(data.tasks);
        }
      }
    } catch (err) {
      console.warn('Failed to regenerate timeline:', err);
    } finally {
      setIsRegenerating(false);
    }
  };

  const totalCount = tasks.length;
  const completedCount = tasks.filter((t) => t.completed).length;
  const overdueCount = tasks.filter((t) => !t.completed && t.dueDate && t.dueDate < todayStr).length;
  const pendingCount = totalCount - completedCount;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'completed') return t.completed;
    if (filter === 'pending') return !t.completed;
    if (filter === 'overdue') return !t.completed && t.dueDate && t.dueDate < todayStr;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Metrics & Progress */}
      <div className="card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
          <div>
            <h3 className="text-lg font-serif font-semibold text-[var(--brown)]">
              Event Preparation Timeline
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Chronological milestones tailored for {formData.eventType} in {formData.city}.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRegenerateTimeline}
              disabled={isRegenerating}
              className="btn-secondary text-xs py-1.5 px-3 h-9"
            >
              {isRegenerating ? 'Generating...' : 'Regenerate schedule'}
            </button>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="btn-primary text-xs py-1.5 px-3 h-9"
            >
              Add task
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-1.5">
          <span>{completedCount} of {totalCount} tasks completed</span>
          <span className="font-semibold text-[var(--text)]">{progressPct}%</span>
        </div>
        <div className="w-full h-2.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded overflow-hidden">
          <div
            className="h-full bg-[var(--maroon)] transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded font-medium transition-colors ${
            filter === 'all'
              ? 'bg-[var(--maroon)] text-white'
              : 'bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface-alt)]'
          }`}
        >
          All ({totalCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('pending')}
          className={`px-3 py-1.5 rounded font-medium transition-colors ${
            filter === 'pending'
              ? 'bg-[var(--maroon)] text-white'
              : 'bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface-alt)]'
          }`}
        >
          Pending ({pendingCount})
        </button>
        {overdueCount > 0 && (
          <button
            type="button"
            onClick={() => setFilter('overdue')}
            className={`px-3 py-1.5 rounded font-medium transition-colors ${
              filter === 'overdue'
                ? 'bg-[var(--warn)] text-white'
                : 'bg-[var(--surface)] text-[var(--warn)] border border-[var(--warn)] hover:bg-[var(--surface-alt)]'
            }`}
          >
            Overdue ({overdueCount})
          </button>
        )}
        <button
          type="button"
          onClick={() => setFilter('completed')}
          className={`px-3 py-1.5 rounded font-medium transition-colors ${
            filter === 'completed'
              ? 'bg-[var(--ok)] text-white'
              : 'bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface-alt)]'
          }`}
        >
          Completed ({completedCount})
        </button>
      </div>

      {/* Add / Edit Task Modal */}
      {showAddModal && (
        <div className="card p-5 border-2 border-[var(--maroon)] bg-[var(--surface)]">
          <h4 className="text-lg font-serif font-semibold text-[var(--brown)] mb-3">
            {editingTaskId ? 'Edit timeline task' : 'Add custom task'}
          </h4>
          <form onSubmit={handleSaveTask} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="field-label">Task title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Confirm wedding car and driver details"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="input-field w-full text-sm"
                />
              </div>

              <div>
                <label className="field-label">Timeline milestone timing *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 4 weeks before, 3 days before"
                  value={whenLabel}
                  onChange={(e) => setWhenLabel(e.target.value)}
                  className="input-field w-full text-sm"
                />
              </div>

              <div>
                <label className="field-label">Specific deadline date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="input-field w-full text-sm"
                />
              </div>

              <div>
                <label className="field-label">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as TimelineTask['category'])}
                  className="input-field w-full text-sm"
                >
                  <option value="Venue">Venue</option>
                  <option value="Catering">Catering</option>
                  <option value="Decor">Decor</option>
                  <option value="Logistics">Logistics</option>
                  <option value="Attire">Attire & Styling</option>
                  <option value="Rituals">Rituals & Pooja</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div>
                <label className="field-label">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TimelineTask['priority'])}
                  className="input-field w-full text-sm"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Normal">Normal</option>
                </select>
              </div>
            </div>

            <div>
              <label className="field-label">Detailed description / instructions</label>
              <textarea
                rows={2}
                placeholder="Specific logistics, contact names or checklist items..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-field w-full text-sm"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button type="submit" className="btn-primary text-sm">
                {editingTaskId ? 'Update task' : 'Save task'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingTaskId(null);
                }}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-[var(--border)] rounded text-[var(--text-muted)] bg-[var(--surface)]">
          <p className="font-serif text-base mb-1">No tasks in this view.</p>
          <p className="text-xs">Adjust your filter or click "Add task" above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((t) => {
            const isOverdue = !t.completed && t.dueDate && t.dueDate < todayStr;
            return (
              <div
                key={t.id}
                className={`p-4 rounded border transition-colors bg-[var(--surface)] ${
                  t.completed
                    ? 'border-[var(--border)] opacity-75'
                    : isOverdue
                    ? 'border-[var(--warn)] bg-[var(--surface-alt)]'
                    : 'border-[var(--border)] hover:border-[var(--maroon)]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={t.completed}
                      onChange={() => handleToggleTask(t.id)}
                      className="mt-1 w-4 h-4 cursor-pointer accent-[var(--maroon)]"
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-semibold text-sm ${t.completed ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text)]'}`}>
                          {t.task}
                        </span>

                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--surface-alt)] text-[var(--text-muted)] border border-[var(--border)]">
                          {t.category}
                        </span>

                        {t.priority === 'High' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--maroon)] text-white">
                            High Priority
                          </span>
                        )}

                        {isOverdue && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--warn)] text-white">
                            Overdue
                          </span>
                        )}
                      </div>

                      {t.description && (
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                          {t.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mt-2">
                        <span>Milestone: <strong className="text-[var(--text)]">{t.when}</strong></span>
                        {t.dueDate && (
                          <span className="tabular-nums">
                            Target date: <strong className={isOverdue ? 'text-[var(--warn)]' : 'text-[var(--text)]'}>{t.dueDate}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(t)}
                      className="text-[var(--maroon)] hover:underline"
                    >
                      Edit
                    </button>
                    <span className="text-[var(--border)]">|</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteTask(t.id)}
                      className="text-[var(--warn)] hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
