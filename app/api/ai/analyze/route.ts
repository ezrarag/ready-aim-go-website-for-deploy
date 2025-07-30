import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a strategic business analyst for ReadyAimGo. Analyze client data and provide actionable insights with the following structure:

1. **Key Priorities** - Top 3-5 immediate action items
2. **Resource Recommendations** - What skills/operators are needed
3. **Timeline Suggestions** - Realistic timeframes for completion
4. **Risk Assessment** - Potential challenges and mitigation strategies
5. **Next Steps** - Specific actionable recommendations

Be concise, practical, and focus on business value.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const analysis = completion.choices[0]?.message?.content || 'No analysis generated';

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('AI analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze with AI' }, 
      { status: 500 }
    );
  }
} 