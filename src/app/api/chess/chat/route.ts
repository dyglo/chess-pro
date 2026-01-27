import { OpenAI } from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
    try {
        const { messages, fen } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: "Messages array is required" }, { status: 400 });
        }

        const systemMessage = {
            role: "system",
            content: `You are a friendly and wise chess coach. You are chatting with a player during a game.
      The current board state is FEN: ${fen || "Unknown"}.
      Answer their questions about the game, strategy, or chess concepts.
      Be encouraging and helpful. Keep responses relatively short and conversational.`,
        };

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [systemMessage, ...messages],
        });

        const reply = completion.choices[0].message.content;

        return NextResponse.json({ reply });
    } catch (error) {
        console.error("OpenAI Chat Error:", error);
        return NextResponse.json(
            { error: "Failed to generate chat response." },
            { status: 500 }
        );
    }
}
