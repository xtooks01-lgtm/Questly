
import React from 'react';

interface NavigationProps {
  currentTab: string;
  setTab: (tab: string) => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentTab, setTab }) => {
  const tabs = [
    { id: 'home', icon: '🏠', label: 'Home' },
    { id: 'chat', icon: '🤖', label: 'Rudhh' },
    { id: 'progress', icon: '📊', label: 'Stats' },
    { id: 'profile', icon: '👤', label: 'Hero' },
    { id: 'settings', icon: '⚙️', label: 'Setup' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass-card border-t border-slate-700/50 pb-8 pt-3 px-6 z-50">
      <div className="flex justify-around items-center max-w-lg mx-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTab(tab.id)}
            className={`flex flex-col items-center gap-1 transition-all duration-300 ${
              currentTab === tab.id ? 'scale-110' : 'opacity-40 grayscale'
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className={`text-[8px] font-black uppercase tracking-tighter ${
              currentTab === tab.id ? 'text-primary' : 'text-slate-400'
            }`}>
              {tab.label}
            </span>
            {currentTab === tab.id && (
              <div className="w-1 h-1 bg-primary rounded-full mt-1 animate-pulse" />
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default Navigation;
