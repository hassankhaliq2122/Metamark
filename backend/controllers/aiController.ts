import { Request, Response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const summarize = async (req: Request, res: Response) => {
  const { comments, projectName } = req.body;

  if (!comments || !Array.isArray(comments)) {
    return res.status(400).send("Comments are required");
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).send("Gemini API key not configured on server");
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
      You are a product manager and UX researcher. 
      Analyze the following feedback comments for the project "${projectName}".
      Summarize the main issues, categorize them (e.g., UI/UX, Bug, Content), 
      and provide actionable recommendations for the developers.

      Comments:
      ${comments.map((c: any, i: number) => `${i + 1}. [Status: ${c.status}] ${c.text}`).join("\n")}

      Format your response in professional Markdown.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    res.json({ summary: response.text() });
  } catch (error: any) {
    console.error("AI Summarization error:", error);
    res.status(500).send(`AI Error: ${error.message}`);
  }
};
