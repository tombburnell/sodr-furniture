"use client";

import { useState } from "react";
import { FurnitureItem } from "./utils/furniture";

interface Analysis {
  description: string;
  type: string;
  style: string;
  size: string;
  colours: string[];
  furniture_ids: string[];
}

export default function Home() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [furniture, setFurniture] = useState<FurnitureItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    // Create FormData
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      setUploadedImage(data.imageUrl);
      setAnalysis(data.analysis);
      setFurniture(data.furniture);
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen h-full bg-gray-200">
      <div className="bg-gray-100 p-8">
        <div className="flex items-center gap-4">
          <label className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded cursor-pointer">
            Upload your image
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleImageUpload}
              disabled={isLoading}
            />
          </label>
          {isLoading && (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
              <span className="text-gray-600">Processing image, please wait.</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-row gap-4 h-full min-h-0">
        <div className="flex flex-col flex-grow bg-black p-8 w-1/2 h-full min-h-screen  text-white">
          {uploadedImage ? (
            <div>
              <img 
                src={uploadedImage} 
                alt="Uploaded image" 
                style={{ objectFit: 'contain' }}
              />
            </div>
          ) : (
            <div className="text-white">Your image will appear here</div>
          )}

          {analysis && (
            <div className="flex flex-col gap-4">
              <div className="mt-4 p-4 flex flex-col bg-gray-800 rounded gap-4 ">
                <div className="">{analysis.description}</div>
                <div><span className="font-bold">type:</span> {analysis.type}</div>
                <div><span className="font-bold">style:</span> {analysis.style}</div>
                <div><span className="font-bold">size:</span> {analysis.size}</div>
                <div>
                  <span className="font-bold">colours:</span>
                  <ul className="list-disc ml-6">
                    {analysis.colours.map((colour: string) => (
                      <li key={colour}>{colour}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <pre className="text-white mt-4 p-4 bg-gray-800 rounded overflow-auto whitespace-pre-wrap text-xs">
                {JSON.stringify(analysis, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="flex flex-col flex-grow shrink-0 w-1/2 gap-4 p-4">
          {furniture?.map((furnitureItem: FurnitureItem) => (
            <div key={furnitureItem.id}>
              <div className="flex flex-col gap-4">
                <img 
                  src={furnitureItem.image_path} 
                  alt={furnitureItem.name} 
                  style={{ objectFit: 'contain' }}
                  className="max-w-full max-h-[300px]"
                />
                <div className="flex flex-col">
                  <div className="font-bold">{furnitureItem.name} (£{furnitureItem.price})</div>
                  <div>{furnitureItem.description}</div>
                </div>
              </div>
            </div>
          ))}
          {furniture.length > 0 && (
            <pre className="text-white mt-4 p-4 bg-gray-800 rounded overflow-auto whitespace-pre-wrap text-xs">
              {JSON.stringify(furniture, null, 2)}
            </pre>
          )}
        </div>  
      </div>
    </div>
  );
}
