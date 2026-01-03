
import React, { useState, useRef } from 'react';
import { UserProfile, Task } from '../types';
import { getAITaskSuggestions } from '../services/geminiService';

interface OnboardingScreenProps {
  onComplete: (user: UserProfile, initialTasks: Task[]) => void;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert("Camera access denied.");
      setShowCamera(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(videoRef.current, 0, 0);
      setImage(canvas.toDataURL('image/jpeg'));
      
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setShowCamera(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleContinue = async () => {
    if (step === 1 && name.trim()) {
      setStep(2);
    } else if (step === 2 && goal.trim()) {
      setStep(3);
    } else if (step === 3) {
      setIsProcessing(true);
      
      // Breakdown the goal with AI immediately
      const suggestions = await getAITaskSuggestions(goal);
      const now = new Date().toISOString();
      const initialTasks: Task[] = suggestions.map(s => ({
        id: Math.random().toString(36).substr(2, 9),
        title: s.title,
        description: s.description,
        category: 'Study',
        difficulty: 'Hard',
        isCompleted: false,
        dueDate: now,
        createdAt: now,
        xpValue: 100,
        isAiGenerated: true
      }));

      // Fixed: Added missing properties (rankXP, currentRank, currentTier, highestRank, isRankedMode)
      // to satisfy the UserProfile and ThemeSettings interfaces.
      const finalUser: UserProfile = {
        name: name.trim(),
        xp: 0,
        level: 1,
        streak: 0,
        totalCompleted: 0,
        badges: [],
        profilePicture: image || `https://picsum.photos/seed/${name}/200`,
        onboardingComplete: true,
        rankXP: 0,
        currentRank: 'Iron',
        currentTier: 'IV',
        highestRank: 'Iron IV',
        settings: {
          color: 'violet',
          isHighContrast: false,
          notificationsEnabled: true,
          rudhhPersonality: 'Brilliant, supportive, and slightly eccentric academic mentor.',
          modelPreference: 'fast',
          isRankedMode: true
        }
      };

      onComplete(finalUser, initialTasks);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#0f172a] flex flex-col items-center justify-center p-8 text-center animate-fadeIn">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-600 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-sm z-10">
        {/* Progress Dots */}
        <div className="flex gap-2 justify-center mb-12">
          {[1, 2, 3].map(i => (
            <div 
              key={i} 
              className={`h-1.5 rounded-full transition-all duration-500 ${
                step === i ? 'w-8 bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]' : 'w-2 bg-slate-800'
              }`} 
            />
          ))}
        </div>

        {/* Steps Content */}
        <div className="min-h-[320px]">
          {step === 1 && (
            <div className="animate-slideIn">
              <h1 className="text-3xl font-black mb-4">Identity</h1>
              <p className="text-slate-400 text-sm mb-8">What should we call you, Scholar?</p>
              <input 
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your Name"
                className="w-full bg-slate-900/50 border-2 border-slate-800 rounded-2xl p-4 text-center text-xl font-bold focus:outline-none focus:border-violet-500 transition-all placeholder:opacity-20"
              />
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-4">
                This is how your journey will be remembered.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="animate-slideIn">
              <h1 className="text-3xl font-black mb-4">Ambition</h1>
              <p className="text-slate-400 text-sm mb-8">What’s the main goal you want to complete right now?</p>
              <textarea 
                autoFocus
                value={goal}
                onChange={e => setGoal(e.target.value)}
                placeholder="e.g. Master React, Prep for Finals, Study Daily..."
                className="w-full h-32 bg-slate-900/50 border-2 border-slate-800 rounded-2xl p-4 text-center text-lg font-medium focus:outline-none focus:border-violet-500 transition-all placeholder:opacity-20 resize-none"
              />
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-4">
                We’ll break this goal into small, achievable quests.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="animate-slideIn">
              <h1 className="text-3xl font-black mb-4">Avatar</h1>
              <p className="text-slate-400 text-sm mb-8">Choose your Hero's appearance.</p>
              
              <div className="flex flex-col items-center gap-6">
                <div className="relative group">
                  <div className={`w-32 h-32 rounded-full border-4 ${image ? 'border-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.3)]' : 'border-slate-800'} overflow-hidden bg-slate-900 flex items-center justify-center transition-all`}>
                    {image ? (
                      <img src={image} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl">👤</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 w-full">
                  <button 
                    onClick={startCamera}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 p-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    📷 Camera
                  </button>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 p-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    📁 Upload
                  </button>
                  <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Camera Modal */}
        {showCamera && (
          <div className="fixed inset-0 z-[110] bg-slate-950 flex flex-col items-center justify-center p-6">
            <video ref={videoRef} autoPlay playsInline className="w-full max-w-sm rounded-3xl mb-8" />
            <div className="flex gap-4">
               <button onClick={capturePhoto} className="w-16 h-16 bg-white rounded-full border-4 border-slate-300" />
               <button 
                  onClick={() => setShowCamera(false)}
                  className="px-6 py-2 text-slate-400 font-bold"
                >Cancel</button>
            </div>
          </div>
        )}

        {/* Action Button */}
        <button 
          onClick={handleContinue}
          disabled={isProcessing || (step === 1 && !name.trim()) || (step === 2 && !goal.trim())}
          className={`w-full mt-12 gradient-bg text-white p-5 rounded-3xl font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl shadow-violet-500/20 disabled:opacity-30 ${isProcessing ? 'animate-pulse' : 'hover:scale-105 active:scale-95'}`}
        >
          {isProcessing ? 'Forging Quests...' : step === 3 ? 'Begin Journey' : 'Continue'}
          <span className="text-xl">➔</span>
        </button>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.8s ease-out forwards; }
        .animate-slideIn { animation: slideIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
      `}</style>
    </div>
  );
};

export default OnboardingScreen;
