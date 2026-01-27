import { OpenAI } from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
    try {
        const { fen, turn } = await req.json();

        if (!fen) {
            return NextResponse.json({ error: "FEN is required" }, { status: 400 });
        }

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `You are a world-class chess grandmaster and coach. 
          Analyze the given board position (FEN) and provide a single, high-impact hint. 
          Do NOT just say the move (e.g., "Nf3"). Explain the *why* behind the best idea (e.g., "Control the center and prepare to castle").
          Keep it concise (max 2 sentences). The user is a beginner to intermediate player.`,
                },
                {
                    role: "user",
                    content: `Current FEN: ${fen}. It is ${turn === "w" ? "White" : "Black"}'s turn to move. What should I do?`,
                },
            ],
        });

        const hint = completion.choices[0].message.content;

        return NextResponse.json({ hint });
    } catch (error) {
        console.error("OpenAI Hint Error:", error);
        return NextResponse.json(
            { error: "Failed to generate hint." },
            { status: 500 }
        );
    }
}
