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

    const prompt = `Given the following translated phrase in ${targetLanguage}:
"${fullTranslatedPhrase}"

Which portion of this ${targetLanguage} phrase corresponds to the following English fragment:
"${originalFragment}"

Please respond with ONLY the corresponding ${targetLanguage} fragment, without any additional explanation or punctuation.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a professional translator assistant." },
        { role: "user", content: prompt }
      ],
      temperature: 1,
      max_tokens: 8075,
    });

    const correspondingTranslation = response.choices[0].message.content?.trim();

    if (!correspondingTranslation) {
      throw new Error('OpenAI API returned empty response');
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