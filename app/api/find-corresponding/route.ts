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
    const { fullTranslatedPhrase, originalFragment, targetLanguage } = await req.json();

    if (!fullTranslatedPhrase || !originalFragment || !targetLanguage) {
      return NextResponse.json(
        { message: "fullTranslatedPhrase, originalFragment, and targetLanguage are required." },
        { status: 400 }
      );
    }

    const prompt = `You are a precise translation tool. Your task is to find the exact corresponding translation in the target language.

Given:
- Full translated phrase in ${targetLanguage}: "${fullTranslatedPhrase}"
- Original English fragment: "${originalFragment}"

Respond with ONLY the exact portion of the ${targetLanguage} phrase that corresponds to the English fragment. Do not add any explanations, punctuation, or additional text.

If the exact corresponding translation cannot be found, respond with "TRANSLATION_NOT_FOUND".`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a professional translator assistant focused on precise fragment matching." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 100,
    });

    const correspondingTranslation = response.choices[0].message.content?.trim();

    if (!correspondingTranslation) {
      throw new Error('OpenAI API returned empty response');
    }

    if (correspondingTranslation === "TRANSLATION_NOT_FOUND") {
      return NextResponse.json({ correspondingTranslation: null });
    }

    return NextResponse.json({ correspondingTranslation });

  } catch (error) {
    console.error('Find corresponding translation error:', error);
    return NextResponse.json(
      { 
        message: error instanceof Error ? error.message : "An unexpected error occurred while finding corresponding translation" 
      },
      { status: 500 }
    );
  }
}