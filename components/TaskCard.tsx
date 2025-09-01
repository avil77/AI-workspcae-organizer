import React, { useState, useMemo } from 'react';
import type { Task, GoogleTaskList } from '../types';
import { taskCategories } from './categoryHelper';
import { PlusIcon } from './icons/PlusIcon';
import { CheckIcon } from './icons/CheckIcon';

interface TaskCardProps {
  task: Task;
  isConfirmed: boolean;
  onConfirm: (selectedTaskListId: string) => Promise<void>;
  onCategoryChange: (newCategory: Task['category']) => void;
  taskLists: GoogleTaskList[];
}

const findBestMatch = (category: Task['category'], lists: GoogleTaskList[]): string | undefined => {
    if (lists.length === 0) return undefined;
    const defaultList = lists[0].id;
    
    const lowerCaseTitleMap: { [id: string]: string } = {};
    lists.forEach(l => { lowerCaseTitleMap[l.id] = l.title.toLowerCase(); });

    switch (category) {
        case 'personal':
            return lists.find(l => lowerCaseTitleMap[l.id].includes('אישי'))?.id || defaultList;
        case 'home_family':
            return lists.find(l => lowerCaseTitleMap[l.id].includes('משפחה') || lowerCaseTitleMap[l.id].includes('בית'))?.id || defaultList;
        case 'clinic_self':
        case 'clinic_secretary':
            return lists.find(l => lowerCaseTitleMap[l.id].includes('קליניקה'))?.id || defaultList;
        case 'project_day_hospital':
            return lists.find(l => lowerCaseTitleMap[l.id].includes('פרויקט') || lowerCaseTitleMap[l.id].includes('אשפוז יום'))?.id || defaultList;
        default:
            return defaultList;
    }
};

const formatDate = (isoString: string | null) => {
    if (!isoString) return 'ללא תאריך יעד';
    try {
        const dateOnly = isoString.split('T')[0];
        const date = new Date(dateOnly);
        // Add timezone offset to prevent off-by-one day errors
        const userTimezoneOffset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() + userTimezoneOffset).toLocaleDateString('he-IL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    } catch (e) {
        return 'תאריך לא חוקי';
    }
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, isConfirmed, taskLists, onConfirm }) => {
  const categoryInfo = taskCategories[task.category] || taskCategories.unknown;
  const [isAdding, setIsAdding] = useState(false);

  const suggestedTaskListId = useMemo(() => findBestMatch(task.category, taskLists), [task.category, taskLists]);
  const [selectedTaskListId, setSelectedTaskListId] = useState(suggestedTaskListId);
  
  React.useEffect(() => {
    if(suggestedTaskListId) {
      setSelectedTaskListId(suggestedTaskListId);
    } else if (taskLists.length > 0) {
      setSelectedTaskListId(taskLists[0].id);
    }
  }, [suggestedTaskListId, taskLists]);

  const handleConfirm = async () => {
    if (!selectedTaskListId) {
        console.error("No task list selected");
        return;
    }
    setIsAdding(true);
    try {
        await onConfirm(selectedTaskListId);
    } catch (e) {
        console.error("Failed to add task:", e);
    } finally {
        setIsAdding(false);
    }
  };

  const isDisabled = isConfirmed || isAdding;

  return (
    <div className={`bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-md transition-all duration-300 ${isDisabled ? 'opacity-60' : 'hover:border-purple-500'}`}>
       <div className="flex justify-between items-start gap-4">
        <div className="flex-grow">
            <h3 className={`font-bold text-lg ${categoryInfo.textColor}`}>{task.title}</h3>
            {taskLists.length > 0 && (
                 <select
                    value={selectedTaskListId}
                    onChange={(e) => setSelectedTaskListId(e.target.value)}
                    disabled={isDisabled}
                    className="mt-2 w-full sm:w-auto bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block p-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    aria-label="בחירת רשימת משימות"
                    >
                    {taskLists.map((list) => (
                        <option key={list.id} value={list.id}>{list.title}</option>
                    ))}
                </select>
            )}
        </div>
        <button
            onClick={handleConfirm}
            disabled={isDisabled || !selectedTaskListId}
            className={`flex items-center justify-center px-4 py-2 rounded-md font-semibold text-sm transition-all whitespace-nowrap w-[150px] ${
                isConfirmed 
                ? 'bg-green-500/20 text-green-300 cursor-default' 
                : isAdding
                ? 'bg-gray-600 cursor-wait'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
            aria-label={isConfirmed ? `נוסף: ${task.title}` : `הוסף למשימות: ${task.title}`}
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
                    <span>הוסף למשימות</span>
                </>
            )}
        </button>
      </div>

      {task.dueDate && (
        <p className="mt-3 pt-3 border-t border-gray-700/50 text-sm text-gray-400">
          <strong className="font-semibold text-gray-200">תאריך יעד:</strong> {formatDate(task.dueDate)}
        </p>
      )}
    </div>
  );
};