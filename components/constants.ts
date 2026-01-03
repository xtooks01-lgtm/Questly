
import { Badge, TaskCategory, TaskDifficulty, RankName, RankTier } from '../types';

export const INITIAL_BADGES: Badge[] = [
  { id: '1', name: 'First Quest', icon: '🚀', description: 'Complete your first task' },
  { id: '2', name: 'Week Warrior', icon: '🔥', description: 'Maintain a 7-day streak' },
  { id: '3', name: 'Scholar', icon: '📚', description: 'Complete 10 study tasks' },
  { id: '4', name: 'Early Bird', icon: '☀️', description: 'Complete a task before 8 AM' },
];

export const CATEGORIES: TaskCategory[] = ['Study', 'Health', 'Coding', 'Creative', 'Other'];

export const DIFFICULTIES: { label: TaskDifficulty; xp: number; color: string }[] = [
  { label: 'Easy', xp: 25, color: 'emerald' },
  { label: 'Hard', xp: 100, color: 'orange' },
  { label: 'Extremely Hard', xp: 250, color: 'rose' },
];

export const RANKS: RankName[] = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Mythic'];
export const TIERS: RankTier[] = ['IV', 'III', 'II', 'I'];
export const XP_PER_TIER = 100;

export const XP_PER_LEVEL = 500;
