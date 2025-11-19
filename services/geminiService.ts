import { GoogleGenAI } from "@google/genai";
import { CsvRow } from '../types';

const getAIClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API_KEY is missing in environment variables.");
    }
    return new GoogleGenAI({ apiKey });
};

export const generateDataReport = async (data: CsvRow[], userQuery: string): Promise<string> => {
    const ai = getAIClient();

    // Convert CSV data to JSON string. 
    // Note: Gemini 2.5 Flash has a very large context window (1M tokens), 
    // so sending raw JSON for standard CSVs (up to tens of MBs) is usually fine.
    // For extremely large datasets, you would want to summarize or sample here.
    const dataString = JSON.stringify(data);

    const prompt = `
    You are an expert Data Analyst and Data Scientist capable of understanding complex CSV structures.
    
    Here is the raw dataset in JSON format:
    \`\`\`json
    ${dataString}
    \`\`\`

    User Query: "${userQuery}"

    INSTRUCTIONS:
    1. Analyze the provided dataset based on the User Query.
    2. Perform any necessary calculations (sums, averages, grouping, filtering).
    3. Generate a comprehensive report in **Thai Language (ภาษาไทย)**.
    4. Use Markdown format for the report.
    5. Include a section for "Stats & Summary" (สรุปสถิติสำคัญ) at the beginning.
    6. Include a section for "Insights & Trends" (ข้อสังเกตและแนวโน้ม) if applicable.
    7. If the query asks for specific groupings (like "amount per BA"), ensure the numbers are accurate.
    8. Format numbers clearly (e.g., use commas for thousands).

    Please provide the Markdown report now.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: "You are a helpful assistant that speaks fluent Thai and is an expert in data analysis.",
                temperature: 0.2, // Low temperature for analytical accuracy
            }
        });

        if (!response.text) {
            throw new Error("No response text received from Gemini.");
        }

        return response.text;

    } catch (error: any) {
        console.error("Gemini API Error:", error);
        throw new Error(error.message || "Failed to generate report.");
    }
};