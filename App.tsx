import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { TextInput } from './components/TextInput';
import { ResultsDisplay } from './components/ResultsDisplay';
import { Loader } from './components/Loader';
import { analyzeText } from './services/geminiService';
import { initClient, handleSignIn, handleSignOut, addCalendarEvent, addGoogleTask, getCalendarLists, getTaskLists } from './services/googleApiService';
import type { AnalysisResult, CalendarEvent, Task, GoogleCalendar, GoogleTaskList } from './types';

const App: React.FC = () => {
  const [inputText, setInputText] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [confirmedItems, setConfirmedItems] = useState<Set<string>>(new Set());

  // Google API State
  const [gapiReady, setGapiReady] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [calendarLists, setCalendarLists] = useState<GoogleCalendar[]>([]);
  const [taskLists, setTaskLists] = useState<GoogleTaskList[]>([]);


  useEffect(() => {
    initClient((user, err) => {
      if (err) {
        setConfigError(err);
        setGapiReady(false); // GAPI is not ready because of config error
        return;
      }
      
      setGapiReady(true);
      if (user) {
        setIsSignedIn(true);
        setGoogleUser(user);
        fetchGoogleLists();
      } else {
        setIsSignedIn(false);
        setGoogleUser(null);
        setCalendarLists([]);
        setTaskLists([]);
      }
    });
  }, []);
  
  const fetchGoogleLists = async () => {
      try {
          const [calendars, tasks] = await Promise.all([getCalendarLists(), getTaskLists()]);
          setCalendarLists(calendars || []);
          setTaskLists(tasks || []);
      } catch (e) {
          console.error("Error fetching Google lists:", e);
          setError("לא ניתן היה לטעון את רשימת היומנים והמשימות.");
      }
  };

  const handleSignInClick = async () => {
    await handleSignIn();
  };

  const handleSignOutClick = () => {
    handleSignOut();
    setAnalysisResult(null); // Clear results on sign out
  };

  const handleConfirmItem = useCallback(async (item: CalendarEvent | Task, itemType: 'event' | 'task', selectedId: string) => {
    setConfirmedItems(prev => new Set(prev).add(item.id));
    if (itemType === 'event') {
        await addCalendarEvent(item as CalendarEvent, selectedId);
    } else {
        await addGoogleTask(item as Task, selectedId);
    }
  }, []);

  const handleCategoryChange = useCallback((itemId: string, itemType: 'event' | 'task', newCategory: string) => {
    setAnalysisResult(prevResult => {
      if (!prevResult) return null;

      if (itemType === 'event') {
        const newEvents = prevResult.events.map(event =>
          event.id === itemId ? { ...event, category: newCategory as CalendarEvent['category'] } : event
        );
        return { ...prevResult, events: newEvents };
      } else {
        const newTasks = prevResult.tasks.map(task =>
          task.id === itemId ? { ...task, category: newCategory as Task['category'] } : task
        );
        return { ...prevResult, tasks: newTasks };
      }
    });
  }, []);


  const handleAnalyzeClick = useCallback(async () => {
    if (!inputText.trim()) {
      setError('נא להזין טקסט לניתוח.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    setConfirmedItems(new Set());

    try {
      const result = await analyzeText(inputText);
      setAnalysisResult(result);
    } catch (err: any) {
      console.error('Error analyzing text:', err);
      setError(err.message || 'אירעה שגיאה בניתוח הטקסט. אנא נסה שוב.');
    } finally {
      setIsLoading(false);
    }
  }, [inputText]);

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans flex flex-col items-center p-4">
      <div className="w-full max-w-2xl mx-auto">
        <Header 
          isSignedIn={isSignedIn}
          userProfile={googleUser?.profileObj}
          onSignIn={handleSignInClick}
          onSignOut={handleSignOutClick}
          isGapiReady={gapiReady}
        />
        <main className="mt-8">
        {configError ? (
            <div className="mt-6 bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-center">
                <h3 className="font-bold text-lg mb-2">שגיאת הגדרות</h3>
                <p>האפליקציה אינה מוגדרת כראוי. ודא שמשתני הסביבה של מפתחות ה-API מוגדרים.</p>
                <p className="text-sm mt-2 text-gray-400 font-mono">{configError}</p>
            </div>
        ) : !gapiReady ? (
          <Loader />
        ) : isSignedIn ? (
          <>
            <TextInput
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onAnalyze={handleAnalyzeClick}
              isLoading={isLoading}
            />

            {error && (
              <div className="mt-6 bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-center">
                <p>{error}</p>
              </div>
            )}
            
            {isLoading && <Loader />}

            {analysisResult && !isLoading && (
              <ResultsDisplay 
                result={analysisResult} 
                confirmedItems={confirmedItems}
                onConfirmItem={handleConfirmItem}
                onCategoryChange={handleCategoryChange}
                calendarLists={calendarLists}
                taskLists={taskLists}
              />
            )}

            {!analysisResult && !isLoading && !error && (
               <div className="mt-8 text-center text-gray-500 bg-gray-800/50 p-6 rounded-lg">
                  <p className="text-lg">הדבק את הטקסט שלך למעלה ולחץ על "נתח" כדי לראות הצעות למשימות ופגישות.</p>
               </div>
            )}
          </>
        ) : (
          <div className="mt-8 text-center text-gray-400 bg-gray-800 p-8 rounded-lg">
            <h2 className="text-2xl font-bold text-white mb-4">ברוך הבא!</h2>
            <p className="text-lg">כדי להתחיל לארגן את היומן והמשימות שלך, אנא התחבר עם חשבון Google שלך.</p>
          </div>
        )}
        </main>
      </div>
    </div>
  );
};

export default App;