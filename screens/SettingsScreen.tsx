
import React, { useState } from 'react';
import { UserProfile, ThemeColor, ChatModel } from '../types';
import { api } from '../services/mockApi';

interface SettingsScreenProps {
  user: UserProfile;
  onUpdateUser: (user: UserProfile) => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ user, onUpdateUser }) => {
  const [isSyncing, setIsSyncing] = useState(false);

  const colors: { id: ThemeColor; hex: string; label: string }[] = [
    { id: 'violet', hex: '#8b5cf6', label: 'Royal' },
    { id: 'emerald', hex: '#10b981', label: 'Forest' },
    { id: 'blue', hex: '#3b82f6', label: 'Ocean' },
    { id: 'rose', hex: '#f43f5e', label: 'Crimson' },
    { id: 'amber', hex: '#f59e0b', label: 'Gold' },
  ];

  const personalities = [
    { label: 'Academic Mentor', value: 'Brilliant, supportive, and slightly eccentric academic mentor.' },
    { label: 'Strict Professor', value: 'A no-nonsense, highly disciplined academic authority who demands excellence.' },
    { label: 'Sarcastic Genius', value: 'Witty, sharp-tongued, but undeniably effective problem solver.' },
    { label: 'Empathetic Coach', value: 'Gentle, motivating, and deeply focused on your mental well-being while studying.' }
  ];

  const updateSetting = <K extends keyof UserProfile['settings']>(key: K, value: UserProfile['settings'][K]) => {
    const updatedUser = {
      ...user,
      settings: {
        ...user.settings,
        [key]: value
      }
    };
    onUpdateUser(updatedUser);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    await api.syncData();
    setIsSyncing(false);
  };

  return (
    <div className="flex flex-col gap-6 animate-fadeIn pb-32">
      <header className="px-2">
        <h1 className="text-3xl font-extrabold tracking-tight">System <span className="gradient-text">Config</span></h1>
        <p className="text-slate-400 text-sm mt-1">Forge your personal academy</p>
      </header>

      {/* Ranked Mode Section */}
      <section className="glass-card p-6 rounded-3xl space-y-4 border-2 border-primary/20 bg-primary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚔️</span>
            <div>
              <h3 className="font-bold text-slate-200">Ranked Mode</h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-tighter">Gain or lose RP based on performance</p>
            </div>
          </div>
          <button 
            onClick={() => updateSetting('isRankedMode', !user.settings.isRankedMode)}
            className={`w-12 h-6 rounded-full transition-all relative ${user.settings.isRankedMode ? 'bg-emerald-500' : 'bg-slate-700'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${user.settings.isRankedMode ? 'left-7' : 'left-1'}`} />
          </button>
        </div>
      </section>

      {/* Dr. Rudhh Personality */}
      <section className="glass-card p-6 rounded-3xl space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xl">🤖</span>
          <h3 className="font-bold text-slate-200">AI Personality</h3>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {personalities.map((p) => (
            <button
              key={p.label}
              onClick={() => updateSetting('rudhhPersonality', p.value)}
              className={`p-3 rounded-2xl text-left transition-all border ${
                user.settings.rudhhPersonality === p.value 
                  ? 'bg-violet-600/20 border-violet-500 shadow-lg' 
                  : 'bg-slate-800/40 border-slate-700 hover:border-slate-500'
              }`}
            >
              <p className={`text-xs font-bold ${user.settings.rudhhPersonality === p.value ? 'text-violet-400' : 'text-slate-200'}`}>
                {p.label}
              </p>
              <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">{p.value}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Visual Identity */}
      <section className="glass-card p-6 rounded-3xl space-y-6">
        <div>
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Aura Color</h3>
          <div className="flex justify-between gap-2">
            {colors.map((c) => (
              <button
                key={c.id}
                onClick={() => updateSetting('color', c.id)}
                className={`flex flex-col items-center gap-2 p-2 rounded-2xl transition-all ${
                  user.settings.color === c.id ? 'bg-slate-800' : 'hover:bg-slate-800/20'
                }`}
              >
                <div 
                  className={`w-10 h-10 rounded-full border-4 ${
                    user.settings.color === c.id ? 'border-white scale-110' : 'border-transparent opacity-60'
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <div>
            <h3 className="font-bold text-slate-200 text-sm">OLED Focus</h3>
            <p className="text-[10px] text-slate-500">Pure blacks for better battery</p>
          </div>
          <button 
            onClick={() => updateSetting('isHighContrast', !user.settings.isHighContrast)}
            className={`w-12 h-6 rounded-full transition-all relative ${user.settings.isHighContrast ? 'bg-violet-600' : 'bg-slate-700'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${user.settings.isHighContrast ? 'left-7' : 'left-1'}`} />
          </button>
        </div>
      </section>

      <button 
        onClick={handleSync}
        disabled={isSyncing}
        className="glass-card p-4 rounded-3xl border-dashed border-2 border-slate-700 text-slate-400 font-bold text-sm hover:border-primary/50 transition-all flex items-center justify-center gap-3"
      >
        {isSyncing ? 'Syncing...' : 'Manual Sync'} 🔄
      </button>

      <footer className="text-center px-6 opacity-30">
        <p className="text-[8px] font-black uppercase tracking-[0.3em]">Questly Core v4.0.0 • Competitive Mode Active</p>
      </footer>
    </div>
  );
};

export default SettingsScreen;
