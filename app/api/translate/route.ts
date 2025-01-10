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
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a precise translation tool. Translate the given text to the target language. Provide ONLY the direct translation without explanations, quotes, or additional context." },
        { role: "user", content: `Translate the following text to ${targetLanguage}:\n\n${text}` }
      ],
      temperature: 0.3,
      max_tokens: 100,
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