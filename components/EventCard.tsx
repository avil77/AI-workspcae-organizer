import React, { useState, useMemo } from 'react';
import type { CalendarEvent, GoogleCalendar } from '../types';
import { eventCategories } from './categoryHelper';
import { PlusIcon } from './icons/PlusIcon';
import { CheckIcon } from './icons/CheckIcon';

interface EventCardProps {
  event: CalendarEvent;
  isConfirmed: boolean;
  onConfirm: (selectedCalendarId: string) => Promise<void>;
  onCategoryChange: (newCategory: CalendarEvent['category']) => void;
  calendarLists: GoogleCalendar[];
}

// Function to find the best matching calendar based on AI category
const findBestMatch = (category: CalendarEvent['category'], calendars: GoogleCalendar[]): string => {
    if (calendars.length === 0) return 'primary';
    const primary = calendars.find(c => c.id.includes('@'))?.id || calendars[0].id;

    const lowerCaseSummaryMap: { [id: string]: string } = {};
    calendars.forEach(c => { lowerCaseSummaryMap[c.id] = c.summary.toLowerCase(); });

    switch (category) {
      case 'personal':
        return calendars.find(c => lowerCaseSummaryMap[c.id].includes('אישי'))?.id || primary;
      case 'family':
        return calendars.find(c => lowerCaseSummaryMap[c.id].includes('משפחה'))?.id || primary;
      case 'clinic_private':
        // FIX: Removed 'clinic_self' case which is not a valid CalendarEvent category.
        return calendars.find(c => lowerCaseSummaryMap[c.id].includes('קליניקה'))?.id || primary;
      case 'public_framework':
        return calendars.find(c => lowerCaseSummaryMap[c.id].includes('ציבורית') || lowerCaseSummaryMap[c.id].includes('עבודה'))?.id || primary;
      case 'study_group':
        return calendars.find(c => lowerCaseSummaryMap[c.id].includes('למידה'))?.id || primary;
      default:
        return primary;
    }
};

const formatDateTime = (isoString: string | null) => {
  if (!isoString) return 'לא צוין';
  try {
    return new Date(isoString).toLocaleString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jerusalem'
    });
  } catch (e) {
    return 'תאריך לא חוקי';
  }
};

export const EventCard: React.FC<EventCardProps> = ({ event, isConfirmed, onConfirm, calendarLists }) => {
  const categoryInfo = eventCategories[event.category] || eventCategories.unknown;
  const [isAdding, setIsAdding] = useState(false);
  
  const suggestedCalendarId = useMemo(() => findBestMatch(event.category, calendarLists), [event.category, calendarLists]);
  const [selectedCalendarId, setSelectedCalendarId] = useState(suggestedCalendarId);

  React.useEffect(() => {
    setSelectedCalendarId(suggestedCalendarId);
  }, [suggestedCalendarId]);

  const handleConfirm = async () => {
    setIsAdding(true);
    try {
        await onConfirm(selectedCalendarId);
    } catch (e) {
        console.error("Failed to add event:", e);
        // Optionally show an error state on the button
    } finally {
        setIsAdding(false);
    }
  };

  const isDisabled = isConfirmed || isAdding;

  return (
    <div className={`bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-md transition-all duration-300 ${isDisabled ? 'opacity-60' : 'hover:border-blue-500'}`}>
      <div className="flex justify-between items-start gap-4">
        <div className="flex-grow">
            <h3 className={`font-bold text-lg ${categoryInfo.textColor}`}>{event.title}</h3>
             {calendarLists.length > 0 && (
                <select
                    value={selectedCalendarId}
                    onChange={(e) => setSelectedCalendarId(e.target.value)}
                    disabled={isDisabled}
                    className="mt-2 w-full sm:w-auto bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    aria-label="בחירת יומן"
                    >
                    {calendarLists.map((calendar) => (
                        <option key={calendar.id} value={calendar.id}>{calendar.summary}</option>
                    ))}
                </select>
            )}
        </div>
        <button
            onClick={handleConfirm}
            disabled={isDisabled}
            className={`flex items-center justify-center px-4 py-2 rounded-md font-semibold text-sm transition-all whitespace-nowrap w-[130px] ${
                isConfirmed 
                ? 'bg-green-500/20 text-green-300 cursor-default' 
                : isAdding
                ? 'bg-gray-600 cursor-wait'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            aria-label={isConfirmed ? `נוסף: ${event.title}` : `הוסף ליומן: ${event.title}`}
        >
            {isConfirmed ? (
                <>
                    <CheckIcon />
                    <span>נוסף</span>
                </>
            ) : isAdding ? (
                 <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="mr-2">מוסיף...</span>
                </>
            ) : (
                <>
                    <PlusIcon />
                    <span>הוסף ליומן</span>
                </>
            )}
        </button>
      </div>
      
      {event.description && <p className="text-gray-300 mt-2 pt-2 border-t border-gray-700/50">{event.description}</p>}
      <div className="mt-3 text-sm text-gray-400 space-y-2">
        {event.startTime && (
            <p><strong className="font-semibold text-gray-200">התחלה:</strong> {formatDateTime(event.startTime)}</p>
        )}
        {event.endTime && (
            <p><strong className="font-semibold text-gray-200">סיום:</strong> {formatDateTime(event.endTime)}</p>
        )}
        {event.location && (
            <p><strong className="font-semibold text-gray-200">מיקום:</strong> {event.location}</p>
        )}
      </div>
    </div>
  );
};