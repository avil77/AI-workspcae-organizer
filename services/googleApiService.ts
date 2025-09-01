import type { CalendarEvent, Task, GoogleCalendar, GoogleTaskList } from '../types';

// FIX: Declare gapi as any since it is loaded from a script tag.
declare const gapi: any;
// FIX: Declare the 'google' namespace to provide types for the Google Identity Services library
// and resolve the "Cannot find namespace 'google'" error.
declare namespace google {
    namespace accounts {
        namespace oauth2 {
            interface TokenResponse {
                access_token: string;
            }

            interface TokenClientConfig {
                client_id: string;
                scope: string;
                callback: (tokenResponse: TokenResponse) => void;
            }
            
            interface TokenClient {
                requestAccessToken(overrideConfig?: { prompt: string }): void;
            }

            function initTokenClient(config: TokenClientConfig): TokenClient;
            
            function revoke(token: string, done: () => void): void;
        }
    }
}

// IMPORTANT: Replace with your actual Google Client ID and API Key
const CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com";
const API_KEY = "YOUR_API_KEY_HERE";

const DEMO_MODE = CLIENT_ID.startsWith("YOUR_");

const DISCOVERY_DOCS = [
    "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest",
    "https://www.googleapis.com/discovery/v1/apis/tasks/v1/rest",
];
const SCOPES = "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/tasks";

let tokenClient: google.accounts.oauth2.TokenClient;
let gapiInited = false;
let gisInited = false;

// --- INITIALIZATION & AUTH ---

/**
 * Initializes the GAPI client, GIS client, and sets up authentication listeners.
 */
export function initClient(updateSigninStatus: (user: any | null, error?: string) => void) {
    if (DEMO_MODE) {
        console.log("DEMO MODE: Auto-signing in with mock user.");
        const mockUser = {
            profileObj: {
                name: "משתמש דוגמה",
                imageUrl: `https://ui-avatars.com/api/?name=Demo+User&background=8e24aa&color=fff`,
            }
        };
        // Use a timeout to simulate async nature and prevent React state update issues
        setTimeout(() => updateSigninStatus(mockUser), 500);
        return;
    }
    
    // @ts-ignore
    gapi.load('client', start);

    async function start() {
        await gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: DISCOVERY_DOCS,
        });
        gapiInited = true;
        checkGapiReady();
    }
    
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse) => {
             // This callback is triggered after the user signs in and grants consent
            if (tokenResponse && tokenResponse.access_token) {
                gapi.client.setToken({ access_token: tokenResponse.access_token });
                // Get user profile
                fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { 'Authorization': `Bearer ${tokenResponse.access_token}` }
                })
                .then(response => response.json())
                .then(profile => {
                    updateSigninStatus({ ...profile, profileObj: { name: profile.name, imageUrl: profile.picture } });
                });
            }
        },
    });
    gisInited = true;
    checkGapiReady();

    function checkGapiReady() {
        if (gapiInited && gisInited) {
            // Initially, we don't know the sign-in status, so we pass null.
            // The main app logic will then decide if it needs to prompt for sign-in.
            updateSigninStatus(null);
        }
    }
}

/**
 *  Sign in the user upon button click.
 */
export function handleSignIn() {
    if (DEMO_MODE) {
      console.log("DEMO MODE: Sign in clicked, but already auto-signed in.");
      return;
    }
    if (!tokenClient) {
        console.error("Google Identity Services token client is not initialized.");
        return;
    }
    tokenClient.requestAccessToken({ prompt: 'consent' });
}

/**
 *  Sign out the user upon button click.
 */
export function handleSignOut() {
    if (DEMO_MODE) {
        console.log("DEMO MODE: Signing out and reloading.");
        window.location.reload();
        return;
    }
    const token = gapi.client.getToken();
    if (token) {
        google.accounts.oauth2.revoke(token.access_token, () => {
            gapi.client.setToken(null);
            window.location.reload(); // Reload to clear state
        });
    }
}


// --- API CALLS ---

/**
 * Creates a new event in the user's Google Calendar.
 */
export async function addCalendarEvent(event: CalendarEvent, calendarId: string = 'primary') {
    if (DEMO_MODE) {
        console.log(`DEMO MODE: Pretending to add event "${event.title}" to calendar "${calendarId}"`);
        await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API call
        return;
    }
    try {
        const resource = {
            'summary': event.title,
            'location': event.location,
            'description': event.description,
            'start': {
                'dateTime': event.startTime,
                'timeZone': 'Asia/Jerusalem'
            },
            'end': {
                'dateTime': event.endTime || event.startTime, // If no end time, make it same as start
                'timeZone': 'Asia/Jerusalem'
            },
        };

        // @ts-ignore
        const request = gapi.client.calendar.events.insert({
            'calendarId': calendarId,
            'resource': resource
        });

        await request.execute();
        console.log('Event created successfully.');

    } catch (error) {
        console.error('Error creating calendar event:', error);
        throw error;
    }
}

/**
 * Creates a new task in the user's Google Tasks.
 */
export async function addGoogleTask(task: Task, taskListId: string) {
    if (DEMO_MODE) {
        console.log(`DEMO MODE: Pretending to add task "${task.title}" to list "${taskListId}"`);
        await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API call
        return;
    }
    if (!taskListId) {
        throw new Error("Task list ID is required to create a task.");
    }
    try {
        const resource = {
            'title': task.title,
            'due': task.dueDate ? `${task.dueDate}T00:00:00.000Z` : undefined
        };

        // @ts-ignore
        const request = gapi.client.tasks.tasks.insert({
            'tasklist': taskListId,
            'resource': resource
        });

        await request.execute();
        console.log('Task created successfully.');

    } catch (error) {
        console.error('Error creating task:', error);
        throw error;
    }
}

/**
 * Fetches the list of the user's calendars.
 */
export async function getCalendarLists(): Promise<GoogleCalendar[] | null> {
    if (DEMO_MODE) {
        console.log("DEMO MODE: Returning mock calendar lists.");
        await new Promise(resolve => setTimeout(resolve, 500));
        return [
            { id: 'personal@demo.com', summary: 'אישי', backgroundColor: '#7986cb' },
            { id: 'family_demo', summary: 'משפחה', backgroundColor: '#33b679' },
            { id: 'clinic_demo', summary: 'קליניקה', backgroundColor: '#d50000' },
            { id: 'work_demo', summary: 'עבודה (מסגרת ציבורית)', backgroundColor: '#8e24aa' },
            { id: 'study_demo', summary: 'קבוצת למידה', backgroundColor: '#e67c73' },
        ];
    }
    try {
        // @ts-ignore
        const response = await gapi.client.calendar.calendarList.list({});
        return response.result.items;
    } catch (e) {
        console.error("Error fetching calendar lists:", e);
        return null;
    }
}

/**
 * Fetches the list of the user's task lists.
 */
export async function getTaskLists(): Promise<GoogleTaskList[] | null> {
    if (DEMO_MODE) {
        console.log("DEMO MODE: Returning mock task lists.");
        await new Promise(resolve => setTimeout(resolve, 500));
        return [
            { id: 'personal_tasks', title: 'אישי' },
            { id: 'family_tasks', title: 'בית ומשפחה' },
            { id: 'clinic_tasks', title: 'קליניקה' },
            { id: 'project_tasks', title: 'פרויקט אשפוז יום' },
        ];
    }
    try {
        // @ts-ignore
        const response = await gapi.client.tasks.tasklists.list({});
        return response.result.items;
    } catch (e) {
        console.error("Error fetching task lists:", e);
        return null;
    }
}