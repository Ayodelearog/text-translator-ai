import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
  }

  try {
    const { text, targetLanguage } = await req.json();

    if (!text || !targetLanguage) {
      return NextResponse.json(
        { message: "Both text and targetLanguage are required." },
        { status: 400 }
      );
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a professional translator." },
        { role: "user", content: `Translate the following text to ${targetLanguage}: "${text}"` }
      ],
      temperature: 1,
      max_tokens: 8075,
    });

    const translatedText = response.choices[0].message.content?.trim();

    if (!translatedText) {
      throw new Error('OpenAI API returned empty response');
    }

    return NextResponse.json({ translatedText });

  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { 
        message: error instanceof Error ? error.message : "An unexpected error occurred during translation" 
      },
      { status: 500 }
    );
  }
}