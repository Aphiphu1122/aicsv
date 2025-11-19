import { GoogleGenAI } from "@google/genai";
import Papa from 'papaparse';
import { CsvRow } from '../types';

const MAX_ROWS = 2000; // Reduced from 5000 to improve response time and prevent timeouts
const TIMEOUT_MS = 60000; // 60 seconds timeout

const getAIClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API_KEY is missing in environment variables.");
    }
    return new GoogleGenAI({ apiKey });
};

export const generateDataReport = async (data: CsvRow[], userQuery: string): Promise<string> => {
    console.log(`[GeminiService] Starting analysis for ${data.length} rows.`);
    const ai = getAIClient();

    // Optimization 1: Truncate data if too large
    let processedData = data;
    let warningNote = "";
    
    if (data.length > MAX_ROWS) {
        console.warn(`[GeminiService] Data exceeds ${MAX_ROWS} rows. Truncating to first ${MAX_ROWS} rows.`);
        processedData = data.slice(0, MAX_ROWS);
        warningNote = `(หมายเหตุ: การวิเคราะห์ทำบนข้อมูล ${MAX_ROWS.toLocaleString()} แถวแรก เพื่อความรวดเร็ว)`;
    }

    // Optimization 2: Convert to CSV String instead of JSON
    console.log(`[GeminiService] Converting to CSV string...`);
    const csvString = Papa.unparse(processedData);
    console.log(`[GeminiService] Payload size approx: ${(csvString.length / 1024).toFixed(2)} KB`);

    const prompt = `
    You are an expert Data Analyst capable of understanding complex CSV structures.
    
    Here is the raw dataset in CSV format:
    \`\`\`csv
    ${csvString}
    \`\`\`

    User Query: "${userQuery}"

    INSTRUCTIONS:
    1. Analyze the provided dataset based on the User Query.
    2. Perform any necessary calculations (sums, averages, grouping, filtering).
    3. Generate a comprehensive report in **Thai Language (ภาษาไทย)**.
    4. Use Markdown format for the report.
    5. Include a section for "Stats & Summary" (สรุปสถิติสำคัญ) at the beginning. ${warningNote}
    6. Include a section for "Insights & Trends" (ข้อสังเกตและแนวโน้ม) if applicable.
    7. If the query asks for specific groupings, ensure the numbers are accurate.
    8. Format numbers clearly (e.g., use commas for thousands).

    Please provide the Markdown report now.
    `;

    try {
        console.log(`[GeminiService] Sending request to Gemini API with ${TIMEOUT_MS}ms timeout...`);
        
        const generatePromise = ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: "You are a helpful assistant that speaks fluent Thai and is an expert in data analysis.",
                temperature: 0.2,
            }
        });

        // Add race condition for timeout
        const response = await Promise.race([
            generatePromise,
            new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error("Request timed out")), TIMEOUT_MS)
            )
        ]);

        console.log(`[GeminiService] Response received.`);

        if (!response.text) {
            throw new Error("No response text received from Gemini.");
        }

        return response.text;

    } catch (error: any) {
        console.error("Gemini API Error:", error);
        
        let errorMessage = error.message || "Failed to generate report.";
        
        // Customize error messages for Thai users
        if (errorMessage.includes("timed out")) {
            errorMessage = "ใช้เวลาประมวลผลนานเกินไป (Timeout) - ข้อมูลอาจมีขนาดใหญ่เกินไป กรุณาลดจำนวนแถวหรือคอลัมน์แล้วลองใหม่";
        } else if (errorMessage.includes("400")) {
             errorMessage = "คำขอไม่ถูกต้อง (400 Bad Request) - ข้อมูลอาจมีขนาดใหญ่เกินขีดจำกัด";
        } else if (errorMessage.includes("503")) {
             errorMessage = "บริการไม่พร้อมใช้งานชั่วคราว (503) - กรุณาลองใหม่ในภายหลัง";
        }

        throw new Error(errorMessage);
    }
};