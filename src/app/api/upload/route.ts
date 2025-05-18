import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import openai from 'openai';
import { FurnitureItem, FurnitureRecommendation, LlmRecommendation, loadFurnitureData } from '@/app/utils/furniture';
import YAML from 'yaml';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Ensure uploads directory exists
    await mkdir(process.env.UPLOAD_PATH!, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a unique filename
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const filename = `${uniqueSuffix}-${file.name}`;
    const path = join(process.env.UPLOAD_PATH!, filename);

    // Save the file
    await writeFile(path, buffer);

    // Call OpenAI Vision API
    console.log(process.env.OPENAI_API_KEY);
    
    const client = new openai.OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    });

    // Create base64 encoding of the image
    const base64Image = buffer.toString('base64');

    const furnitureData = loadFurnitureData();
    
    const prompt =
                `Analyze this image and provide a JSON response with keys
                - description (a description of the room)
                - type (the type of room, eg kitchen, living room, bedroom, etc)            
                - style (era, mood, style, design etc)
                - size (small, medium, large)
                - colours (list of key colours, try to be specific)                
                
                - recommended_furniture (array of furniture items that would suit the room, ideally 10-15 but dont include inappropriate items)
                    - ensure the furniture is suitable for the room type and style - eg no dining tables in bedrooms or mattresses in bedrooms.
                    - don't consider mixed use rooms like kitchen diners or studios
                    - pick up subtle clues from image and description to make a good recommendation 
                    - Modern is overused so downplay it.
                        - eg a "modern" kitchen with a rustic feel should not show modern furniture because it doesn't fit the style.                         
                    - out must be of the format
                        [ { 
                            "furniture_id": "123",
                            "reason": "This bed would suit this room because it's a bedroom and the style suggests a classic look",
                        }]       
                    - order by most suitable first.

                FURNITURE_DATA: 
                ${YAML.stringify(furnitureData)}
                `

    console.log(`Prompt: ${prompt}`);
    // Make the API call
    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini-2025-04-14",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ],
        }
      ],
      max_tokens: 4000,
      response_format: { type: "json_object" }
    });

    const content = response.choices?.[0]?.message?.content || '{}';
    const analysis = JSON.parse(content);

    const recommendedFurniture = analysis.recommended_furniture;

    console.log("recommendedFurniture:", recommendedFurniture);

    const furniture: FurnitureRecommendation[] = recommendedFurniture.map((recommendation: LlmRecommendation) => {
        const fItem = furnitureData.find((furnitureItem: FurnitureItem) => {
          return furnitureItem.id === recommendation.furniture_id
        });
  
        if (!fItem) {
          console.log(`Furniture item not found for id: ${recommendation.furniture_id}`);
          return null; 
        }
        return {
            furniture: fItem,
            reason: recommendation.reason
        }
      }).filter((item: FurnitureRecommendation | null | undefined): item is FurnitureRecommendation => item !== null && item !== undefined);

    // console.log("Furniture", furniture);

    // Save the analysis to a JSON file
    const jsonPath = join(process.env.UPLOAD_PATH!, `${filename}.json`);
    await writeFile(jsonPath, JSON.stringify(analysis, null, 2));

    // Return the URL of the uploaded file
    return NextResponse.json({ 
      imageUrl: `/api/uploads/${filename}`,
      analysis: analysis,
      furniture: furniture
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Error uploading file' },
      { status: 500 }
    );
  }
} 
