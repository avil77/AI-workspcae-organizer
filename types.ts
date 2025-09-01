export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string | null;
  endTime: string | null;
  description: string | null;
  location: string | null;
  category: 'personal' | 'family' | 'clinic_private' | 'public_framework' | 'study_group' | 'unknown';
}

export interface Task {
  id: string;
  title: string;
  dueDate: string | null;
  category: 'personal' | 'home_family' | 'clinic_self' | 'clinic_secretary' | 'project_day_hospital' | 'unknown';
}

export interface AnalysisResult {
  events: CalendarEvent[];
  tasks: Task[];
}

export interface GoogleCalendar {
    id: string;
    summary: string;
    backgroundColor: string;
}
  
export interface GoogleTaskList {
    id: string;
    title: string;
}