
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { DailyProgress, UserProfile, Task } from '../types';

interface ProgressScreenProps {
  user: UserProfile;
  history: DailyProgress[];
  tasks: Task[];
}

const ProgressScreen: React.FC<ProgressScreenProps> = ({ user, history, tasks }) => {
  const averageTime = useMemo(() => {
    const completedTasks = tasks.filter(t => t.isCompleted && t.completedAt);
    if (completedTasks.length === 0) return '0m';
    
    const totalMs = completedTasks.reduce((acc, t) => {
      const start = new Date(t.createdAt).getTime();
      const end = new Date(t.completedAt!).getTime();
      return acc + (end - start);
    }, 0);
    
    const avgMs = totalMs / completedTasks.length;
    const mins = Math.floor(avgMs / 60000);
    const hours = Math.floor(mins / 60);
    
    if (hours > 0) return `${hours}h ${mins % 60}m`;
    return `${mins}m`;
  }, [tasks]);

  return (
    <div className="flex flex-col gap-6 animate-fadeIn pb-32">
      <header className="px-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Mastery <span className="gradient-text">Stats</span></h1>
        <p className="text-slate-400 text-sm mt-1">Consistency is the key to leveling up</p>
      </header>

      {/* Hero Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card p-5 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/10 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-700" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Avg. Quest Time</p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-orange-500">{averageTime}</span>
            <span className="text-xl">⏱️</span>
          </div>
        </div>
        <div className="glass-card p-5 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-700" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Completed</p>
          <div className="flex items-center gap-2">
            <span className="text-4xl font-black text-blue-500">{user.totalCompleted}</span>
            <span className="text-xl">✅</span>
          </div>
        </div>
      </div>

      {/* Activity Chart */}
      <div className="glass-card p-6 rounded-3xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-bold text-lg">Weekly Activity</h2>
          <span className="text-xs text-slate-500 font-medium">Last 7 days</span>
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={history}>
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                dy={10}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #334155', 
                  borderRadius: '12px',
                  fontSize: '12px'
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 6, 6]}>
                {history.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.count > 3 ? '#8b5cf6' : '#3b82f6'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Level Card */}
      <div className="glass-card p-6 rounded-3xl bg-gradient-to-br from-indigo-900/20 to-slate-900">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-violet-600 flex items-center justify-center text-2xl font-black shadow-xl shadow-violet-900/40">
            {user.level}
          </div>
          <div>
            <h3 className="font-bold">Next Level: {user.level + 1}</h3>
            <p className="text-xs text-slate-400">Keep grinding to reach greatness</p>
          </div>
        </div>
        <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
          <div 
            className="h-full gradient-bg shadow-[0_0_15px_rgba(139,92,246,0.3)]" 
            style={{ width: `${(user.xp % 500) / 5}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-[10px] font-bold text-slate-500 uppercase">
          <span>{user.xp % 500} XP</span>
          <span>500 XP</span>
        </div>
      </div>
    </div>
  );
};

export default ProgressScreen;
