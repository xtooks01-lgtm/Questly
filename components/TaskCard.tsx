
import React, { useState, useRef } from 'react';
import { Task } from '../types';

interface TaskCardProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleSubTask?: (taskId: string, subTaskId: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onToggle, onDelete, onToggleSubTask }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showConfirmComplete, setShowConfirmComplete] = useState(false);
  const startX = useRef(0);
  const threshold = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping || showConfirmDelete || showConfirmComplete) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;
    
    if (task.isCompleted && diff > 0) {
      setSwipeOffset(diff * 0.3);
    } else {
      setSwipeOffset(diff);
    }
  };

  const handleTouchEnd = () => {
    if (showConfirmDelete || showConfirmComplete) return;
    setIsSwiping(false);
    if (swipeOffset > threshold && !task.isCompleted) {
      setShowConfirmComplete(true);
    } else if (swipeOffset < -threshold) {
      setShowConfirmDelete(true);
    }
    setSwipeOffset(0);
  };

  const calculateDuration = () => {
    if (!task.isCompleted || !task.completedAt) return null;
    const start = new Date(task.createdAt).getTime();
    const end = new Date(task.completedAt).getTime();
    const diffMs = end - start;
    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(mins / 60);
    
    if (hours > 0) return `${hours}h ${mins % 60}m`;
    if (mins > 0) return `${mins}m`;
    return 'Just now';
  };

  const duration = calculateDuration();
  const hasSubtasks = !!task.subTasks?.length;

  const getDifficultyColor = () => {
    switch (task.difficulty) {
      case 'Easy': return 'text-emerald-400 bg-emerald-400/10';
      case 'Hard': return 'text-orange-400 bg-orange-400/10';
      case 'Extremely Hard': return 'text-rose-400 bg-rose-400/10';
      default: return 'text-slate-400 bg-slate-400/10';
    }
  };

  const getSwipeBg = () => {
    if (swipeOffset > 0) return 'bg-emerald-500/20';
    if (swipeOffset < -0) return 'bg-rose-500/20';
    return 'bg-transparent';
  };

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (task.isCompleted) {
      onToggle(task.id);
    } else {
      setShowConfirmComplete(true);
    }
  };

  const formattedDueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : null;

  return (
    <div className="relative overflow-hidden rounded-2xl select-none group">
      <div className={`absolute inset-0 flex items-center justify-between px-6 transition-colors duration-200 ${getSwipeBg()}`}>
        <div className={`transition-opacity duration-200 ${swipeOffset > 20 ? 'opacity-100' : 'opacity-0'}`}>
          <span className="text-emerald-400 font-black text-xs uppercase tracking-widest">Complete</span>
        </div>
        <div className={`transition-opacity duration-200 ${swipeOffset < -20 ? 'opacity-100' : 'opacity-0'}`}>
          <span className="text-rose-400 font-black text-xs uppercase tracking-widest">Delete</span>
        </div>
      </div>

      <div 
        className={`glass-card rounded-2xl transition-all duration-300 relative overflow-hidden flex flex-col z-10 ${
          task.isCompleted ? 'opacity-60 grayscale-[0.5]' : 'hover:border-primary/50'
        } ${isSwiping ? 'transition-none' : 'ease-out'}`}
        style={{ transform: `translateX(${swipeOffset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center gap-3 p-4">
          <button
            onClick={handleToggleClick}
            className={`w-7 h-7 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-300 ${
              task.isCompleted 
                ? 'bg-primary border-primary scale-110 shadow-[0_0_15px_rgba(139,92,246,0.5)]' 
                : 'border-slate-600 hover:border-primary'
            }`}
          >
            {task.isCompleted && (
              <svg className="w-4 h-4 text-white animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>

          <div className="flex-1 min-w-0 py-1">
            <div className="flex items-center justify-between gap-2">
              <h3 
                onClick={() => setIsExpanded(!isExpanded)}
                className={`font-semibold text-sm truncate cursor-pointer transition-all ${task.isCompleted ? 'line-through text-slate-500' : 'text-slate-100'}`}
              >
                {task.title}
              </h3>
              <div className="flex items-center gap-2 flex-shrink-0">
                {formattedDueDate && !task.isCompleted && (
                  <span className="text-[9px] font-bold text-slate-500 bg-slate-800/50 px-1.5 py-0.5 rounded">
                    📅 {formattedDueDate}
                  </span>
                )}
                <button 
                  onClick={() => setIsExpanded(!isExpanded)}
                  className={`p-1 text-slate-500 hover:text-slate-300 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex items-center flex-wrap gap-2 mt-1">
              <span className={`text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded ${getDifficultyColor()}`}>
                {task.difficulty}
              </span>
              <span className="text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
                {task.category}
              </span>
              <p className="text-[9px] text-slate-400 font-medium uppercase tracking-widest">
                {task.xpValue} XP
              </p>
              {task.isCompleted && duration && (
                <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 rounded">
                  ⏱️ {duration}
                </span>
              )}
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="px-4 pb-4 animate-fadeIn border-t border-slate-700/30 pt-3 bg-slate-900/10">
            {task.subTasks?.length ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                   <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Sub-Quests</p>
                   <p className="text-[9px] text-slate-500 font-bold">{task.subTasks.filter(s => s.isCompleted).length}/{task.subTasks.length}</p>
                </div>
                {task.subTasks.map(st => (
                  <div key={st.id} className="flex items-center gap-3">
                    <button 
                      onClick={() => onToggleSubTask?.(task.id, st.id)}
                      className={`w-4 h-4 rounded border flex-shrink-0 transition-colors ${st.isCompleted ? 'bg-blue-500 border-blue-500' : 'border-slate-700'}`}
                    >
                      {st.isCompleted && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
                    </button>
                    <span className={`text-xs ${st.isCompleted ? 'line-through text-slate-500' : 'text-slate-300'}`}>{st.title}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 leading-relaxed italic">
                {task.description || "No further details for this mission."}
              </p>
            )}
          </div>
        )}
      </div>

      {showConfirmDelete && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-2 bg-slate-950/90 backdrop-blur-sm animate-fadeIn">
          <div className="flex flex-col items-center gap-3 text-center p-4">
            <p className="text-xs font-black uppercase tracking-widest text-rose-400">Abandon this mission?</p>
            <div className="flex gap-4">
              <button onClick={() => onDelete(task.id)} className="px-5 py-2 bg-rose-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:scale-105 transition-all">Abandon</button>
              <button onClick={() => setShowConfirmDelete(false)} className="px-5 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold uppercase tracking-widest hover:scale-105 transition-all">Hold on</button>
            </div>
          </div>
        </div>
      )}

      {showConfirmComplete && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-2 bg-slate-950/90 backdrop-blur-sm animate-fadeIn">
          <div className="flex flex-col items-center gap-3 text-center p-4">
            <div className="text-3xl mb-1 animate-bounce">🏆</div>
            <p className="text-xs font-black uppercase tracking-widest text-emerald-400">Confirm Victory?</p>
            <div className="flex gap-4">
              <button 
                onClick={() => {
                  setShowConfirmComplete(false);
                  onToggle(task.id);
                }} 
                className="px-5 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:scale-105 transition-all"
              >
                Complete
              </button>
              <button 
                onClick={() => setShowConfirmComplete(false)} 
                className="px-5 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold uppercase tracking-widest hover:scale-105 transition-all"
              >
                Not yet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskCard;
