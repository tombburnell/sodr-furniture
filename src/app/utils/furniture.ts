import fs from 'fs';
import path from 'path';

export interface FurnitureItem {
  id: string;
  name: string;
  category: string;
  description: string;
  wood_type: string;
  finish: string;
  dimensions: {
    depth: number;
    width: number;
    height: number;
  };
  price: number;
  weight: number;
  image_path: string;
  stock: number;
  sku: string;
  status: string;
  created_at: string;
  updated_at: string;
  featured: boolean;
  discount_price: number;
  tags: string[] | null;
}

export function loadFurnitureData(): FurnitureItem[] {
  const furnitureDir = path.join(process.cwd(), 'furniture');
  const allFurniture: FurnitureItem[] = [];

  try {
    // Read all files in the furniture directory
    const files = fs.readdirSync(furnitureDir, { withFileTypes: true });
    
    // Filter for JSON files and process each one, skipping directories and files we can't access
    const jsonFiles = files
      .filter(file => file.isFile() && file.name.endsWith('.json'))
      .map(file => file.name);
    
    jsonFiles.forEach(file => {
      try {
        const filePath = path.join(furnitureDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const furniture = JSON.parse(fileContent);
        if (furniture?.data) {
          allFurniture.push(furniture.data);
        }
      } catch (error) {
        // Log but continue if we can't read a specific file
        console.warn(`Could not read file ${file}:`, error);
      }
    });
    return allFurniture.flat(); //flatten the array

  } catch (error) {
    console.error('Error loading furniture data:', error);
    return [];
  }
}
