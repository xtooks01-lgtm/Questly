
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Task, UserProfile, DailyProgress, RankName, RankTier } from './types';
import { api } from './services/mockApi';
import Navigation from './components/Navigation';
import HomeScreen from './screens/HomeScreen';
import ProgressScreen from './screens/ProgressScreen';
import ProfileScreen from './screens/ProfileScreen';
import SettingsScreen from './screens/SettingsScreen';
import AiLabScreen from './screens/AiLabScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import { XP_PER_LEVEL, RANKS, TIERS, XP_PER_TIER } from './components/constants';
import { getProgressNudge } from './services/geminiService';

const LogoQ = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M80 50C80 66.5685 66.5685 80 50 80C33.4315 80 20 66.5685 20 50C20 33.4315 33.4315 20 50 20C60.5422 20 69.8375 25.4326 75.2536 33.6749" 
      stroke="url(#logo-gradient)" 
      strokeWidth="10" 
      strokeLinecap="round"
    />
    <path 
      d="M60 60L85 85" 
      stroke="url(#logo-gradient)" 
      strokeWidth="10" 
      strokeLinecap="round"
    />
    <path d="M72 38L78 30" stroke="var(--bg-main)" strokeWidth="12" strokeLinecap="round" />
    <defs>
      <linearGradient id="logo-gradient" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
        <stop stopColor="var(--primary-color)" />
        <stop offset="1" stopColor="#3b82f6" />
      </linearGradient>
    </defs>
  </svg>
);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<DailyProgress[]>([]);
  const [nudge, setNudge] = useState<string>('');
  const [showCelebration, setShowCelebration] = useState(false);
  const [lastXPChange, setLastXPChange] = useState<{ amount: number; isGain: boolean } | null>(null);
  const [rankTransition, setRankTransition] = useState<{ type: 'up' | 'down'; rank: string } | null>(null);

  useEffect(() => {
    const data = api.getData();
    setTasks(data.tasks);
    setUser(data.user);
    setHistory(data.history);

    if (data.user.onboardingComplete) {
      fetchNudge();
    }
  }, []);

  // Persist user and tasks on change
  useEffect(() => {
    if (user) api.updateUser(user);
  }, [user]);

  useEffect(() => {
    if (tasks.length > 0) api.updateTasks(tasks);
  }, [tasks]);

  const calculateRankAndTier = (xp: number): { rank: RankName; tier: RankTier; absoluteRankValue: number } => {
    const totalTiers = Math.floor(xp / XP_PER_TIER);
    const rankIndex = Math.min(Math.floor(totalTiers / TIERS.length), RANKS.length - 1);
    const tierIndex = totalTiers % TIERS.length;
    return {
      rank: RANKS[rankIndex],
      tier: TIERS[tierIndex],
      absoluteRankValue: totalTiers
    };
  };

  const getAbsoluteRankValueFromLabel = (label: string) => {
    const parts = label.split(' ');
    if (parts.length < 2) return 0;
    const rIdx = RANKS.indexOf(parts[0] as RankName);
    const tIdx = TIERS.indexOf(parts[1] as RankTier);
    return (rIdx * TIERS.length) + tIdx;
  };

  const fetchNudge = async () => {
    const data = api.getData();
    const completed = data.tasks.filter(t => t.isCompleted).length;
    try {
      const msg = await getProgressNudge(completed, data.tasks.length);
      setNudge(msg);
    } catch (e) {
      setNudge("Focus on the journey.");
    }
  };

  const updateTasks = (newTasks: Task[]) => {
    setTasks(newTasks);
  };

  const updateUser = (updatedUser: UserProfile) => {
    setUser(updatedUser);
  };

  const handleOnboardingComplete = (finalUser: UserProfile, initialTasks: Task[]) => {
    updateUser(finalUser);
    updateTasks(initialTasks);
    setShowCelebration(true);
    setTimeout(() => {
      setShowCelebration(false);
      fetchNudge();
    }, 4000);
  };

  const handleTaskXP = useCallback((xpValue: number, isMajorQuest: boolean = true) => {
    if (!user) return;

    const newXP = Math.max(0, user.xp + xpValue);
    const newLevel = Math.floor(newXP / XP_PER_LEVEL) + 1;
    
    let newRankXP = user.rankXP;
    let newCurrentRank = user.currentRank;
    let newCurrentTier = user.currentTier;
    let newHighestRank = user.highestRank;

    if (user.settings.isRankedMode) {
      newRankXP = Math.max(0, user.rankXP + xpValue);
      const oldStatus = calculateRankAndTier(user.rankXP);
      const newStatus = calculateRankAndTier(newRankXP);

      setLastXPChange({ amount: Math.abs(xpValue), isGain: xpValue > 0 });
      setTimeout(() => setLastXPChange(null), 3000);

      if (newStatus.absoluteRankValue !== oldStatus.absoluteRankValue) {
        const isUp = newRankXP > user.rankXP;
        setRankTransition({ 
          type: isUp ? 'up' : 'down', 
          rank: `${newStatus.rank} ${newStatus.tier}` 
        });
        setTimeout(() => setRankTransition(null), 4000);
      }

      newCurrentRank = newStatus.rank;
      newCurrentTier = newStatus.tier;

      const currentHighestVal = getAbsoluteRankValueFromLabel(user.highestRank);
      if (newStatus.absoluteRankValue > currentHighestVal) {
        newHighestRank = `${newStatus.rank} ${newStatus.tier}`;
      }
    }

    const totalCompletedChange = isMajorQuest ? (xpValue > 0 ? 1 : -1) : 0;

    const updatedUser: UserProfile = { 
      ...user, 
      xp: newXP, 
      level: newLevel,
      rankXP: newRankXP,
      currentRank: newCurrentRank,
      currentTier: newCurrentTier,
      highestRank: newHighestRank,
      totalCompleted: Math.max(0, user.totalCompleted + totalCompletedChange)
    };

    setUser(updatedUser);
    
    if (isMajorQuest && xpValue > 0) {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const todayLabel = days[new Date().getDay()];
      setHistory(prevHistory => {
        const newHistory = prevHistory.map(h => 
          h.date === todayLabel ? { ...h, count: h.count + 1 } : h
        );
        api.updateHistory(newHistory);
        return newHistory;
      });
      fetchNudge();
    }
  }, [user]);

  const themeStyles = useMemo(() => {
    if (!user) return {};
    const colorMap: any = { violet: '#8b5cf6', emerald: '#10b981', blue: '#3b82f6', rose: '#f43f5e', amber: '#f59e0b' };
    return {
      '--primary-color': colorMap[user.settings.color],
      '--bg-main': user.settings.isHighContrast ? '#000000' : '#0f172a',
    };
  }, [user]);

  if (!user) return null;
  if (!user.onboardingComplete) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  return (
    <div 
      className={`min-h-screen max-w-lg mx-auto relative transition-colors duration-500 overflow-x-hidden ${showCelebration ? 'celebrate-glow' : ''}`}
      style={{ ...themeStyles, backgroundColor: 'var(--bg-main)', color: '#f8fafc' } as any}
    >
      {/* Rank Transition Overlay */}
      {rankTransition && (
        <div className="fixed inset-0 z-[300] bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center animate-fadeIn p-8 text-center">
          <div className={`w-32 h-32 rounded-full mb-8 flex items-center justify-center text-5xl shadow-2xl animate-scaleUp ${rankTransition.type === 'up' ? 'bg-emerald-500 shadow-emerald-500/40' : 'bg-rose-500 shadow-rose-500/40'}`}>
            {rankTransition.type === 'up' ? '🎖️' : '📉'}
          </div>
          <h2 className={`text-4xl font-black mb-2 tracking-tighter ${rankTransition.type === 'up' ? 'text-emerald-400' : 'text-rose-400'}`}>
            {rankTransition.type === 'up' ? 'RANK UP!' : 'RANK DOWN'}
          </h2>
          <p className="text-xl font-bold text-white mb-8 tracking-widest uppercase">
            {rankTransition.rank}
          </p>
          <div className="h-1 w-24 bg-white/20 rounded-full overflow-hidden">
            <div className={`h-full animate-progress ${rankTransition.type === 'up' ? 'bg-emerald-400' : 'bg-rose-400'}`} style={{ width: '100%' }} />
          </div>
        </div>
      )}

      {lastXPChange && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-full font-black text-sm animate-bounce shadow-lg ${lastXPChange.isGain ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
          {lastXPChange.isGain ? '+' : '-'}{lastXPChange.amount} RANK XP
        </div>
      )}

      {showCelebration && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none">
          <div className="bg-violet-500/20 backdrop-blur-md px-8 py-4 rounded-3xl border border-violet-500/50 animate-bounce">
            <h2 className="text-xl font-black text-white tracking-widest">YOUR QUEST BEGINS NOW</h2>
          </div>
        </div>
      )}

      <header className="p-6 pb-2 flex items-center justify-between sticky top-0 bg-inherit/80 backdrop-blur-md z-40">
        <div className="flex items-center gap-2">
          <LogoQ className="w-8 h-8" />
          <span className="text-xl font-black tracking-tighter">QUESTLY</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
             <span className="text-[10px] font-black text-primary uppercase tracking-widest block">Lvl {user.level}</span>
             <div className="w-12 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
               <div className="h-full bg-primary" style={{ width: `${(user.xp % XP_PER_LEVEL) / (XP_PER_LEVEL/100)}%` }} />
             </div>
          </div>
          <div className="w-8 h-8 rounded-full border-2 border-primary/30 overflow-hidden bg-slate-800">
            <img src={user.profilePicture} className="w-full h-full object-cover" />
          </div>
        </div>
      </header>

      <main className="p-6 pt-2">
        {activeTab === 'home' && (
          <>
            {nudge && (
              <div className="bg-slate-800/40 border border-slate-700/50 p-3 rounded-2xl mb-6 flex gap-3 items-center animate-slideIn">
                <span className="text-lg">✨</span>
                <p className="text-xs text-slate-300 italic">"{nudge}"</p>
              </div>
            )}
            <HomeScreen tasks={tasks} onTasksUpdate={updateTasks} onComplete={handleTaskXP} />
          </>
        )}
        {activeTab === 'chat' && <AiLabScreen user={user} />}
        {activeTab === 'progress' && <ProgressScreen user={user} history={history} tasks={tasks} />}
        {activeTab === 'profile' && <ProfileScreen user={user} />}
        {activeTab === 'settings' && <SettingsScreen user={user} onUpdateUser={updateUser} />}
      </main>

      <Navigation currentTab={activeTab} setTab={setActiveTab} />

      <style>{`
        :root { --primary-color: #8b5cf6; --bg-main: #0f172a; }
        .text-primary { color: var(--primary-color); }
        .bg-primary { background-color: var(--primary-color); }
        .gradient-bg { background: linear-gradient(135deg, var(--primary-color) 0%, #3b82f6 100%); }
        .glass-card { background: rgba(30, 41, 59, 0.6); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.05); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes scaleUp { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
        @keyframes progress { from { width: 0%; } to { width: 100%; } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
        .animate-slideIn { animation: slideIn 0.5s ease-out forwards; }
        .animate-scaleUp { animation: scaleUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .animate-progress { animation: progress 4s linear forwards; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .celebrate-glow {
          box-shadow: inset 0 0 100px rgba(139,92,246,0.3);
          transition: box-shadow 1s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default App;
