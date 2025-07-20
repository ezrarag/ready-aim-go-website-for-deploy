import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function fetchAndExtract(url: string) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error('Failed to fetch URL');
  const html = await res.text();
  const $ = cheerio.load(html);

  const title = $('title').text() || '';
  const metaDescription = $('meta[name="description"]').attr('content') || '';
  const h1 = $('h1').first().text() || '';

  // Get visible text (basic approach)
  let text = $('body').text().replace(/\s+/g, ' ').trim();
  // Limit to 1000 words
  text = text.split(' ').slice(0, 1000).join(' ');

  return { title, metaDescription, h1, text };
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid url' }, { status: 400 });
    }
    const scraped = await fetchAndExtract(url);

    const systemPrompt = `You are a business analyst. Given this website content, identify the business type and recommend up to 3 job tasks and the roles required to support this business digitally and physically. Return structured JSON like:\n{ business_type: string, suggested_roles: string[], predicted_workstreams: string[] }`;

    const userContent = `Title: ${scraped.title}\nMeta Description: ${scraped.metaDescription}\nH1: ${scraped.h1}\nText: ${scraped.text}`;

    const aiRes = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 512,
    });

    // Try to parse the response as JSON
    let aiJson;
    try {
      aiJson = JSON.parse(aiRes.choices[0].message.content || '{}');
    } catch {
      aiJson = { error: 'AI response was not valid JSON', raw: aiRes.choices[0].message.content };
    }

    return NextResponse.json({ scraped, ai: aiJson });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
} 