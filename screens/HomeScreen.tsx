
import React, { useState } from 'react';
import { Task, TaskCategory, TaskDifficulty, PracticeQuestion } from '../types';
import { getAITaskSuggestions, getMasteryChallenge, MasteryChallenge } from '../services/geminiService';
import TaskCard from '../components/TaskCard';
import { CATEGORIES, DIFFICULTIES } from '../components/constants';

interface HomeScreenProps {
  tasks: Task[];
  onTasksUpdate: (tasksOrUpdater: Task[] | ((prev: Task[]) => Task[])) => void;
  onComplete: (xp: number, isMajorQuest: boolean) => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ tasks, onTasksUpdate, onComplete }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>('Study');
  const [difficulty, setDifficulty] = useState<TaskDifficulty>('Easy');
  const [dueDate, setDueDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Mastery Challenge State
  const [masteryData, setMasteryData] = useState<MasteryChallenge | null>(null);
  const [showMastery, setShowMastery] = useState(false);
  const [masteryStep, setMasteryStep] = useState(0); // 0 to 9 for questions
  const [masteryAnswers, setMasteryAnswers] = useState<Record<number, string>>({});
  const [isMasteryLoading, setIsMasteryLoading] = useState(false);
  const [isMasteryPrompted, setIsMasteryPrompted] = useState(false);

  const toggleTask = async (id: string) => {
    const taskToComplete = tasks.find(t => t.id === id);
    if (!taskToComplete) return;

    const isCompleting = !taskToComplete.isCompleted;
    
    const updated = tasks.map(t => {
      if (t.id === id) {
        const now = new Date().toISOString();
        if (isCompleting) {
          onComplete(t.xpValue, true);
          return { ...t, isCompleted: true, completedAt: now };
        } else {
          onComplete(-t.xpValue, true);
          return { ...t, isCompleted: false, completedAt: undefined };
        }
      }
      return t;
    });
    
    onTasksUpdate(updated);

    if (isCompleting) {
      // Initiate the Mastery Phase prompt
      setIsMasteryPrompted(true);
      setShowMastery(true);
      setIsMasteryLoading(true);
      try {
        const data = await getMasteryChallenge(taskToComplete.title);
        setMasteryData(data);
      } catch (e) {
        console.error(e);
        setShowMastery(false);
      } finally {
        setIsMasteryLoading(false);
      }

      // Clean up view
      setTimeout(() => {
         onTasksUpdate(prev => prev.filter(t => !t.isCompleted || t.id === id));
      }, 500);
    }
  };

  const handleSkipMastery = () => {
    addEffectiveQuest();
    setShowMastery(false);
    setMasteryData(null);
    setIsMasteryPrompted(false);
  };

  const addEffectiveQuest = () => {
    if (!masteryData) return;
    const now = new Date().toISOString();
    const nextTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      title: `Effective: ${masteryData.nextQuest.title}`,
      description: masteryData.nextQuest.description,
      category: (masteryData.nextQuest.category as TaskCategory) || 'Study',
      difficulty: 'Hard',
      isCompleted: false,
      dueDate: now,
      createdAt: now,
      xpValue: 150,
      isAiGenerated: true
    };
    onTasksUpdate(prev => [nextTask, ...prev.filter(t => !t.isCompleted)]);
  };

  const handleMasteryFinish = () => {
    if (!masteryData) return;
    
    // Award Bonus XP for finishing the 10 questions (10 XP per question)
    onComplete(100, false);
    
    addEffectiveQuest();
    setShowMastery(false);
    setMasteryData(null);
    setIsMasteryPrompted(false);
  };

  const toggleSubTask = (taskId: string, subTaskId: string) => {
    onTasksUpdate(prev => prev.map(t => {
      if (t.id === taskId && t.subTasks) {
        const subTask = t.subTasks.find(st => st.id === subTaskId);
        if (subTask) {
          if (!subTask.isCompleted) {
            onComplete(5, false);
          } else {
            onComplete(-5, false);
          }
          const newSubTasks = t.subTasks.map(st => 
            st.id === subTaskId ? { ...st, isCompleted: !st.isCompleted } : st
          );
          return { ...t, subTasks: newSubTasks };
        }
      }
      return t;
    }));
  };

  const deleteTask = (id: string) => {
    onTasksUpdate(prev => prev.filter(t => t.id !== id));
  };

  const clearCompleted = () => {
    onTasksUpdate(prev => prev.filter(t => !t.isCompleted));
  };

  const addTask = () => {
    if (!newTitle.trim()) return;
    const now = new Date().toISOString();
    const diffData = DIFFICULTIES.find(d => d.label === difficulty);
    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      title: newTitle,
      category,
      difficulty,
      isCompleted: false,
      dueDate: new Date(dueDate).toISOString(),
      createdAt: now,
      xpValue: diffData?.xp || 50,
      isAiGenerated: false
    };
    onTasksUpdate(prev => [newTask, ...prev]);
    resetForm();
  };

  const handleAiSuggestions = async () => {
    if (!newTitle.trim()) return;
    
    const now = new Date().toISOString();
    const diffData = DIFFICULTIES.find(d => d.label === difficulty);
    const questTitle = newTitle;
    const questId = Math.random().toString(36).substr(2, 9);
    
    const newTask: Task = {
      id: questId,
      title: questTitle,
      category,
      difficulty,
      isCompleted: false,
      dueDate: new Date(dueDate).toISOString(),
      createdAt: now,
      xpValue: (diffData?.xp || 50),
      isAiGenerated: true,
      subTasks: []
    };
    
    // UI Updates Instantly
    onTasksUpdate(prev => [newTask, ...prev]);
    resetForm(); 

    // Background AI Process
    getAITaskSuggestions(questTitle).then(suggestions => {
      if (suggestions && suggestions.length > 0) {
        onTasksUpdate(prev => prev.map(t => 
          t.id === questId ? {
            ...t,
            xpValue: t.xpValue + (suggestions.length * 10),
            subTasks: suggestions.map(s => ({
              id: Math.random().toString(36).substr(2, 5),
              title: s.title,
              isCompleted: false
            }))
          } : t
        ));
      }
    });
  };

  const resetForm = () => {
    setNewTitle('');
    setCategory('Study');
    setDifficulty('Easy');
    setDueDate(new Date().toISOString().split('T')[0]);
    setIsAdding(false);
    setIsAiLoading(false);
  };

  const completedCount = tasks.filter(t => t.isCompleted).length;
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

  const filteredTasks = tasks.filter(task => 
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex flex-col gap-6 animate-fadeIn pb-32">
      <section className="flex justify-between items-end px-2">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Today's <span className="gradient-text">Quests</span></h1>
          <p className="text-slate-400 text-sm mt-1">{completedCount}/{tasks.length} tasks completed honorably</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-violet-400">{progress}%</span>
          <div className="w-24 h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
            <div 
              className="h-full gradient-bg transition-all duration-1000" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </section>

      {/* Search Bar */}
      <div className="px-2">
        <div className="glass-card flex items-center gap-3 px-4 py-3 rounded-2xl border border-slate-700/50 focus-within:border-violet-500/50 transition-all">
          <span className="text-slate-500">🔍</span>
          <input 
            type="text" 
            placeholder="Search your missions..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none flex-1 text-sm text-slate-100 placeholder:text-slate-500"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="text-slate-500 hover:text-slate-300 text-xs font-bold uppercase"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <button 
          onClick={() => setIsAdding(true)}
          className="flex-1 glass-card p-4 rounded-2xl border-dashed border-2 border-slate-700 hover:border-violet-500/50 transition-all flex items-center justify-center gap-2 group"
        >
          <span className="text-xl group-hover:scale-125 transition-transform">➕</span>
          <span className="font-bold text-slate-400 group-hover:text-violet-400">New Quest</span>
        </button>
        {completedCount > 0 && (
          <button 
            onClick={clearCompleted}
            className="px-4 glass-card rounded-2xl border border-slate-700 text-slate-500 hover:text-white transition-all flex items-center gap-2"
            title="Refresh List"
          >
            🧹 <span className="text-xs font-bold uppercase hidden sm:inline">Clean</span>
          </button>
        )}
      </div>

      {/* Mastery Challenge Modal */}
      {showMastery && (
        <div className="fixed inset-0 bg-slate-950/95 z-[100] flex flex-col items-center justify-center p-6 overflow-y-auto animate-fadeIn">
          <div className="glass-card w-full max-w-md p-6 rounded-3xl border border-violet-500/30 shadow-2xl relative">
            {isMasteryLoading ? (
               <div className="flex flex-col items-center justify-center py-20 text-center gap-6">
                  <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
                  <div className="space-y-2">
                    <h2 className="text-xl font-black text-white uppercase tracking-widest">Analyzing Quest...</h2>
                    <p className="text-xs text-slate-500 italic">Dr. Rudhh is preparing your mastery challenge...</p>
                  </div>
               </div>
            ) : isMasteryPrompted && masteryData ? (
               <div className="text-center space-y-6 py-8">
                  <div className="text-5xl animate-bounce">⚡</div>
                  <div>
                    <h2 className="text-2xl font-black text-white mb-2 uppercase">Mastery Opportunity</h2>
                    <p className="text-sm text-slate-400">Complete a 10-question bonus challenge to earn <span className="text-emerald-400 font-bold">+100 XP</span> and cement your knowledge.</p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={() => setIsMasteryPrompted(false)}
                      className="w-full bg-violet-600 hover:bg-violet-500 text-white p-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-violet-500/20"
                    >
                      Accept Challenge
                    </button>
                    <button 
                      onClick={handleSkipMastery}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 p-4 rounded-2xl font-black uppercase tracking-widest transition-all"
                    >
                      Skip Mastery
                    </button>
                  </div>
               </div>
            ) : masteryData && masteryData.questions.length > 0 ? (
               <div className="space-y-6">
                 <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest">Bonus Challenge</span>
                    <span className="text-[10px] font-bold text-slate-500">{masteryStep + 1} / {masteryData.questions.length}</span>
                 </div>
                 
                 <div className="min-h-[120px]">
                    <h3 className="text-lg font-bold text-slate-100 leading-tight">
                      {masteryData.questions[masteryStep]?.question}
                    </h3>
                 </div>

                 <div className="space-y-3">
                    {masteryData.questions[masteryStep]?.options.map((option, idx) => (
                      <button 
                        key={idx}
                        onClick={() => {
                          setMasteryAnswers({ ...masteryAnswers, [masteryStep]: option });
                        }}
                        className={`w-full text-left p-4 rounded-2xl border transition-all text-sm font-medium ${
                          masteryAnswers[masteryStep] === option 
                            ? 'bg-violet-600/20 border-violet-500 text-violet-300' 
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                 </div>

                 <div className="pt-4 flex flex-col gap-3">
                    {masteryStep < masteryData.questions.length - 1 ? (
                       <button 
                         disabled={!masteryAnswers[masteryStep]}
                         onClick={() => setMasteryStep(s => s + 1)}
                         className="w-full bg-white text-slate-950 p-4 rounded-2xl font-black uppercase tracking-widest disabled:opacity-50 transition-all"
                       >
                         Next Question ➔
                       </button>
                    ) : (
                       <button 
                         disabled={!masteryAnswers[masteryStep]}
                         onClick={handleMasteryFinish}
                         className="w-full bg-emerald-500 text-white p-4 rounded-2xl font-black uppercase tracking-widest disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/20"
                       >
                         Complete Bonus Quest
                       </button>
                    )}
                    <button 
                      onClick={handleSkipMastery}
                      className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-2 hover:text-slate-400"
                    >
                      Abandon Challenge
                    </button>
                 </div>
               </div>
            ) : (
              <div className="text-center py-12">
                 <p className="text-slate-400">Mastery Exam could not be generated.</p>
                 <button onClick={() => setShowMastery(false)} className="mt-4 text-violet-500 font-bold">Close</button>
              </div>
            )}
          </div>
        </div>
      )}

      {isAdding && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 overflow-y-auto">
          <div className="glass-card w-full max-w-md p-6 rounded-3xl border border-violet-500/30 shadow-2xl animate-scaleUp my-auto">
            <h2 className="text-xl font-bold mb-4 text-white">Initiate Mission</h2>
            
            <textarea 
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="What is your focus?"
              className="w-full h-20 bg-slate-900 border border-slate-700 rounded-xl p-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500 transition-all mb-4 resize-none"
              disabled={isAiLoading}
            />

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Branch</p>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value as TaskCategory)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-violet-500"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Timeline</p>
                <input 
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Difficulty Tier</p>
              <div className="flex gap-2">
                {DIFFICULTIES.map(diff => (
                  <button 
                    key={diff.label}
                    onClick={() => setDifficulty(diff.label)}
                    disabled={isAiLoading}
                    className={`flex-1 px-2 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-wider transition-all border ${
                      difficulty === diff.label 
                        ? `bg-${diff.color}-500/20 border-${diff.color}-500 text-${diff.color}-400 shadow-lg shadow-${diff.color}-500/10` 
                        : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-600'
                    }`}
                  >
                    {diff.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={handleAiSuggestions}
                disabled={isAiLoading || !newTitle.trim()}
                className="w-full bg-white text-slate-950 hover:bg-violet-50 p-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
              >
                {isAiLoading ? 'Strategizing...' : '✨ Deploy AI Strategy'}
              </button>
              <button 
                onClick={addTask}
                disabled={isAiLoading || !newTitle.trim()}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 p-3 rounded-xl font-bold transition-all disabled:opacity-50"
              >
                Manual Entry
              </button>
            </div>
            <button 
              onClick={() => setIsAdding(false)}
              className="w-full mt-4 text-slate-500 text-sm hover:text-slate-300 font-medium"
            >
              Abort
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filteredTasks.length > 0 ? (
          filteredTasks.map(task => (
            <TaskCard 
              key={task.id} 
              task={task} 
              onToggle={toggleTask} 
              onDelete={deleteTask}
              onToggleSubTask={toggleSubTask}
            />
          ))
        ) : (
          <div className="py-10 text-center">
            <p className="text-slate-500 text-sm">No missions found matching "{searchQuery}"</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomeScreen;
