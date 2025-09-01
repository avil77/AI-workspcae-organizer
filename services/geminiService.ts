import { GoogleGenAI, Type } from "@google/genai";
import type { AnalysisResult, CalendarEvent, Task } from "../types";

// FIX: Per @google/genai guidelines, the API key must be sourced from environment variables.
// The application will run in DEMO_MODE if the API key is not provided.
const API_KEY = process.env.API_KEY;

const DEMO_MODE = !API_KEY;
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    events: {
      type: Type.ARRAY,
      description: "A list of potential calendar events found in the text.",
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "The title or summary of the event." },
          startTime: { type: Type.STRING, description: "The start date and time in ISO 8601 format. Null if not found." },
          endTime: { type: Type.STRING, description: "The end date and time in ISO 8601 format. Null if not found." },
          description: { type: Type.STRING, description: "A brief description of the event. Null if not found." },
          location: { type: Type.STRING, description: "The location of the event. Null if not found." },
          category: {
            type: Type.STRING,
            description: "The category of the event.",
            enum: ['personal', 'family', 'clinic_private', 'public_framework', 'study_group', 'unknown'],
          },
        },
        required: ["title", "startTime", "endTime", "description", "location", "category"],
      },
    },
    tasks: {
      type: Type.ARRAY,
      description: "A list of potential tasks found in the text.",
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "The title or content of the task." },
          dueDate: { type: Type.STRING, description: "The due date in ISO 8601 format (date only). Null if not found." },
          category: {
            type: Type.STRING,
            description: "The category of the task.",
            enum: ['personal', 'home_family', 'clinic_self', 'clinic_secretary', 'project_day_hospital', 'unknown'],
          },
        },
        required: ["title", "dueDate", "category"],
      },
    },
  },
  required: ["events", "tasks"],
};

export const analyzeText = async (text: string): Promise<AnalysisResult> => {
  if (DEMO_MODE) {
    console.log("DEMO MODE: Returning mock analysis result.");
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay
    const now = new Date();
    const mockResult: AnalysisResult = {
      events: [
        {
          id: `evt-${Date.now()}-0`,
          title: 'פגישה עם דני',
          startTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
          description: 'שיחה על הפרויקט החדש',
          location: 'בית קפה במרכז',
          category: 'public_framework',
        },
        {
          id: `evt-${Date.now()}-1`,
          title: 'חוג כדורגל של הילד',
          startTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          endTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000).toISOString(),
          description: null,
          location: 'מגרש עירוני',
          category: 'family',
        },
      ],
      tasks: [
        {
          id: `tsk-${Date.now()}-0`,
          title: 'להכין את המצגת',
          dueDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
          // FIX: Changed category to a valid Task category. 'public_framework' is for events.
          category: 'project_day_hospital',
        },
        {
          id: `tsk-${Date.now()}-1`,
          title: 'לקנות חלב',
          dueDate: null,
          category: 'home_family',
        },
      ],
    };
    return mockResult;
  }
  
  if (!ai) {
    throw new Error("Gemini API is not configured. The API_KEY environment variable is missing.");
  }

  const currentYear = new Date().getFullYear();
  const prompt = `
    Analyze the following Hebrew text. Extract all potential calendar events and tasks.
    The current year is ${currentYear}.

    For each item, you MUST categorize it into one of the specified categories based on the context.

    **Event Categories:**
    - 'personal': For your personal appointments, hobbies, self-time.
    - 'family': For family events, kids' activities, school events, vacations, household appointments (e.g., doctor). This calendar is shared with your wife.
    - 'clinic_private': For appointments with patients, professional calls, writing letters in your private clinic. A virtual assistant has view/manage access.
    - 'public_framework': For work meetings, team meetings, and dedicated time for the "day hospital" project in your public setting job.
    - 'study_group': For the bi-weekly learning group meetings. This calendar is shared with the group.

    **Task Categories:**
    - 'personal': Things you need to do for yourself.
    - 'home_family': Shared list with your wife for the home. e.g., "buy milk", "fix the faucet".
    - 'clinic_self': Tasks for you to do related to the clinic. e.g., "call patient X", "review medication for Y".
    - 'clinic_secretary': Administrative tasks that can be delegated to a secretary.
    - 'project_day_hospital': Tasks related to the day hospital project. e.g., "write protocol", "contact procurement".

    If a category is unclear from the text, use 'unknown'.

    For each event, provide: title, startTime, endTime, description, location, and category.
    For each task, provide: title, dueDate, and category.

    Use ISO 8601 format for all dates and times. If information like location, description, or date is missing, return null for that field.
    Respond ONLY with a JSON object matching the provided schema.

    Text to analyze:
    ---
    ${text}
    ---
    `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });
    
    const responseText = response.text.trim();
    const parsedJson = JSON.parse(responseText);

    // Basic validation to ensure the structure matches AnalysisResult
    if (parsedJson && Array.isArray(parsedJson.events) && Array.isArray(parsedJson.tasks)) {
        // Add unique IDs to each item for state management in the UI
        const resultWithIds: AnalysisResult = {
            events: parsedJson.events.map((event: Omit<CalendarEvent, 'id'>, index: number) => ({
                ...event,
                id: `evt-${Date.now()}-${index}`
            })),
            tasks: parsedJson.tasks.map((task: Omit<Task, 'id'>, index: number) => ({
                ...task,
                id: `tsk-${Date.now()}-${index}`
            }))
        };
        return resultWithIds;
    } else {
        throw new Error("Invalid JSON structure received from API.");
    }

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to analyze text with Gemini API.");
  }
};