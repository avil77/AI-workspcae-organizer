import React from 'react';
import type { AnalysisResult, CalendarEvent, GoogleCalendar, GoogleTaskList, Task } from '../types';
import { EventCard } from './EventCard';
import { TaskCard } from './TaskCard';
import { CalendarIcon } from './icons/CalendarIcon';
import { TaskIcon } from './icons/TaskIcon';

interface ResultsDisplayProps {
  result: AnalysisResult;
  confirmedItems: Set<string>;
  onConfirmItem: (item: CalendarEvent | Task, itemType: 'event' | 'task', selectedId: string) => Promise<void>;
  onCategoryChange: (id: string, itemType: 'event' | 'task', newCategory: string) => void;
  calendarLists: GoogleCalendar[];
  taskLists: GoogleTaskList[];
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ result, confirmedItems, onConfirmItem, onCategoryChange, calendarLists, taskLists }) => {
  const hasEvents = result.events && result.events.length > 0;
  const hasTasks = result.tasks && result.tasks.length > 0;

  if (!hasEvents && !hasTasks) {
    return (
        <div className="mt-8 text-center text-gray-400 bg-gray-800 p-6 rounded-lg">
            <p className="text-lg">לא נמצאו אירועים או משימות בטקסט שסופק.</p>
        </div>
    );
  }

  return (
    <div className="mt-8 space-y-8 animate-fade-in">
      {hasEvents && (
        <section>
          <h2 className="text-2xl font-semibold mb-4 text-blue-300 flex items-center gap-3">
            <CalendarIcon />
            הצעות ליומן
          </h2>
          <div className="space-y-4">
            {result.events.map((event) => (
              <EventCard 
                key={event.id} 
                event={event}
                isConfirmed={confirmedItems.has(event.id)}
                onConfirm={(selectedCalendarId) => onConfirmItem(event, 'event', selectedCalendarId)}
                onCategoryChange={(newCategory) => onCategoryChange(event.id, 'event', newCategory)}
                calendarLists={calendarLists}
              />
            ))}
          </div>
        </section>
      )}

      {hasTasks && (
        <section>
          <h2 className="text-2xl font-semibold mb-4 text-purple-300 flex items-center gap-3">
            <TaskIcon />
            הצעות למשימות
          </h2>
          <div className="space-y-4">
            {result.tasks.map((task) => (
              <TaskCard 
                key={task.id}
                task={task} 
                isConfirmed={confirmedItems.has(task.id)}
                onConfirm={(selectedTaskListId) => onConfirmItem(task, 'task', selectedTaskListId)}
                onCategoryChange={(newCategory) => onCategoryChange(task.id, 'task', newCategory)}
                taskLists={taskLists}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};