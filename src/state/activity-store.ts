import { create } from 'zustand';

export interface ActivityEvent {
  id: string;
  timestamp: number;
  toolName: string;
  inputSummary: string;
  status: 'success' | 'error';
  resultSummary: string;
}

interface ActivityState {
  events: ActivityEvent[];
  addEvent: (event: Omit<ActivityEvent, 'id' | 'timestamp'>) => void;
  clearEvents: () => void;
}

const MAX_EVENTS = 50;

export const useActivityStore = create<ActivityState>((set) => ({
  events: [],
  addEvent: (event) => set((state) => {
    const newEvent: ActivityEvent = {
      ...event,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
    };
    const nextEvents = [newEvent, ...state.events].slice(0, MAX_EVENTS);
    return { events: nextEvents };
  }),
  clearEvents: () => set({ events: [] })
}));
