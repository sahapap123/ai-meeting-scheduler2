// app/api/auth/calendar/quick/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../[...nextauth]/route";
import OpenAI from "openai";
import { GoogleCalendar } from "@/lib/google-calendar";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { text } = await req.json();
    if (!text) {
      return NextResponse.json({ ok: false, error: "Missing text" }, { status: 400 });
    }

    const googleCalendar = new GoogleCalendar(session);
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
            role: "system",
            content: `You are a smart calendar assistant. Today is ${new Date().toISOString()}. Your goal is to help the user manage their Google Calendar. First, check for conflicts. If there's a conflict, inform the user in Thai and do not create the event. If there are no conflicts, create the event and confirm its creation in Thai. Default event duration is 1 hour.`,
        },
        { role: "user", content: text },
    ];
    
    const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
        { type: "function", function: { name: "create_event", description: "Creates a new event in the Google Calendar.", parameters: { type: "object", properties: { summary: { type: "string" }, startTime: { type: "string" }, endTime: { type: "string" } }, required: ["summary", "startTime", "endTime"] } } },
        { type: "function", function: { name: "check_availability", description: "Checks if a time slot is available in the Google Calendar.", parameters: { type: "object", properties: { startTime: { type: "string" }, endTime: { type: "string" } }, required: ["startTime", "endTime"] } } },
    ];

    for (let i = 0; i < 5; i++) { 
        const response = await openai.chat.completions.create({ model: "gpt-4-turbo", messages: messages, tools: tools, tool_choice: "auto" });
        const responseMessage = response.choices[0].message;
        const toolCalls = responseMessage.tool_calls;

        if (toolCalls) {
            messages.push(responseMessage);
            for (const toolCall of toolCalls) {
                if(toolCall.type !== 'function') continue;
                const functionName = toolCall.function.name;
                const functionArgs = JSON.parse(toolCall.function.arguments);
                let functionResponse;

                if (functionName === "check_availability") {
                    const existingEvents = await googleCalendar.checkAvailability(functionArgs.startTime, functionArgs.endTime);
                    if (existingEvents.length > 0) {
                        functionResponse = `Conflict found. The user is busy with '${existingEvents[0].summary}' during that time. Please inform the user in Thai.`;
                    } else {
                        functionResponse = "Time slot is available. You may now proceed to create the event.";
                    }
                } else if (functionName === "create_event") {
                    const newEvent = await googleCalendar.createEvent(functionArgs);
                    return NextResponse.json({ ok: true, event: newEvent });
                }
                messages.push({ tool_call_id: toolCall.id, role: "tool", content: functionResponse! });
            }
        } else {
            return NextResponse.json({ ok: true, text_response: responseMessage.content });
        }
    }
    return NextResponse.json({ ok: false, error: "AI could not complete the request." }, { status: 500 });
  } catch (error) {
    console.error("Error processing smart request:", error);
    return NextResponse.json({ ok: false, error: "Failed to process AI request" }, { status: 500 });
  }
}