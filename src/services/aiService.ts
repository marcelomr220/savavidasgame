import { GoogleGenAI, Type } from "@google/genai";

export interface GeneratedBlock {
  type: 'text' | 'image' | 'verse';
  verse_number?: number;
  text?: string;
  content?: string;
  prompt?: string;
}

function getAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Chave de API do Gemini não encontrada. Verifique as configurações do ambiente.");
  }
  return new GoogleGenAI({ apiKey });
}

export async function analyzeVisualTemplate(base64Image: string): Promise<string[]> {
  const ai = getAI();
  const prompt = `
    Analyze the layout of this Bible chapter screenshot.
    Identify the sequence of visual elements.
    Use only these types: "image", "verse", "text".
    
    Rules:
    - "hero image" or "section image" should be "image".
    - "verse blocks" or "verse groups" should be "verse".
    - "titles" or "text blocks" should be "text".
    
    Return ONLY a JSON array of strings representing the sequence.
    Example: ["image", "text", "verse", "image", "verse"]
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      { text: prompt },
      {
        inlineData: {
          mimeType: "image/png",
          data: base64Image
        }
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });

  return JSON.parse(response.text);
}

export async function generateChapterContent(
  bookName: string,
  chapterNumber: number,
  structure: string[]
): Promise<{ title: string; blocks: GeneratedBlock[] }> {
  const ai = getAI();
  const structureStr = structure.join(', ');
  
  const prompt = `
    Create a structured visual Bible chapter.
    Book: ${bookName}
    Chapter: ${chapterNumber}

    Follow this layout pattern:
    ${structureStr}

    For each block in the pattern:
    - If it's a 'verse', generate the biblical verse text for this chapter and verse number (incrementing from 1).
    - If it's an 'image', generate a detailed image prompt describing the scene related to the preceding or following verses.
    - If it's 'text', generate a short explanatory or devotional text related to the chapter.

    Return ONLY a JSON object with this structure:
    {
      "title": "A title for this chapter",
      "blocks": [
        { "type": "verse", "verse_number": 1, "text": "..." },
        { "type": "image", "prompt": "..." },
        { "type": "text", "content": "..." }
      ]
    }
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          blocks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, enum: ['verse', 'image', 'text'] },
                verse_number: { type: Type.NUMBER },
                text: { type: Type.STRING },
                content: { type: Type.STRING },
                prompt: { type: Type.STRING }
              },
              required: ['type']
            }
          }
        },
        required: ['title', 'blocks']
      }
    }
  });

  return JSON.parse(response.text);
}

export async function generateImage(prompt: string): Promise<string> {
  const ai = getAI();
  const fullPrompt = `biblical illustration, epic cinematic, ${prompt}, ancient world, divine light, highly detailed, realistic style`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: [{ text: fullPrompt }],
    config: {
      imageConfig: {
        aspectRatio: "16:9"
      }
    }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return part.inlineData.data; // Base64 string
    }
  }
  
  throw new Error("Falha ao gerar imagem");
}
