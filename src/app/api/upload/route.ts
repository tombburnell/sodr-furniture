import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import openai from 'openai';
import { FurnitureItem, loadFurnitureData } from '@/app/utils/furniture';
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
    
    // - furniture (list of urls from the FURNITURE_DATA below that could match the description, style, size and colours)
    const prompt = 
                `Analyze this image and provide a JSON response with keys
                - description (a description of the room)
                - type (the type of room, eg kitchen, living room, bedroom, etc)            
                - style (era, mood, style, design etc)
                - size (small, medium, large)
                - colours (list of key colours, try to be specific)                
                - furniture_ids (array of at least 10 ids from the FURNITURE_DATA below for items of furniture that best match the room, description, style, size and colours. Don't select matresses for gardens or vanity units for kitchens etc.)


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

    const furnitureIds = analysis.furniture_ids;

    console.log("furnitureData:", furnitureData);
    
    const furniture = furnitureIds.map((id: string) => {
      const fItem = furnitureData.find((furnitureItem: FurnitureItem) => {
        return furnitureItem.id === id
      });

      if (!fItem) {
        console.log(`Furniture item not found for id: ${id}`);
      }
      return fItem;
    }).filter((item: FurnitureItem | undefined): item is FurnitureItem => item !== undefined);

    console.log("Furniture", furniture);

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