import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const { text, fileName } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'OpenAI API key not configured',
        roles: {},
        fileName,
        extractedAt: new Date().toISOString()
      });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Extract roles from business plan using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert business analyst and HR specialist. Your task is to extract all job roles (both traditional and modern) necessary to start and grow a business from a business plan. 

Analyze the business plan and identify all required roles, then categorize them into logical groups. Consider both immediate startup needs and future growth positions.

Return ONLY a valid JSON object with this exact structure:
{
  "Marketing": ["Role 1", "Role 2"],
  "Engineering": ["Role 1", "Role 2"],
  "Operations": ["Role 1", "Role 2"],
  "Finance": ["Role 1", "Role 2"],
  "Legal": ["Role 1", "Role 2"],
  "Sales": ["Role 1", "Role 2"],
  "Customer Support": ["Role 1", "Role 2"],
  "Management": ["Role 1", "Role 2"]
}

Only include categories that have roles. If a category has no roles, omit it entirely.`
        },
        {
          role: "user",
          content: `Extract all job roles from this business plan and categorize them:

${text}

Return the roles as JSON.`
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    let rolesData;
    try {
      rolesData = JSON.parse(response);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', response);
      throw new Error('Invalid response format from AI');
    }

    return NextResponse.json({
      success: true,
      roles: rolesData,
      fileName,
      extractedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error parsing business plan:', error);
    return NextResponse.json(
      { error: 'Failed to parse business plan' },
      { status: 500 }
    );
  }
} 