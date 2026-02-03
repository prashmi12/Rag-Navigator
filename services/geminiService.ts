
import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";
import { DocumentFile, Message } from "../types";

const MODEL_NAME = 'gemini-3-pro-preview';

export class GeminiRAGService {
  private ai: GoogleGenAI;
  private chatInstance: Chat | null = null;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY || '' });
  }

  private buildSystemInstruction(docs: DocumentFile[]): string {
    const docContext = docs.map(d => `--- DOCUMENT: ${d.name} ---\n${d.content}`).join('\n\n');
    
    return `You are a professional research assistant with deep expertise in document analysis.
    
CONTEXT:
You have been provided with the following documents:
${docContext}

INSTRUCTIONS:
1. Answer the user's questions strictly using the information provided in the documents above.
2. If the answer is not in the documents, state clearly that you cannot find the information in the provided context.
3. When referencing information, mention the specific document name if possible.
4. Keep your tone professional, concise, and helpful.
5. You can use markdown for formatting (bold, lists, code blocks).
6. Provide citations for your claims in the format [Document Name].`;
  }

  async initializeChat(docs: DocumentFile[]) {
    const systemInstruction = this.buildSystemInstruction(docs);
    
    this.chatInstance = this.ai.chats.create({
      model: MODEL_NAME,
      config: {
        systemInstruction,
        temperature: 0.2, // Lower temperature for more factual RAG responses
      },
    });
  }

  async sendMessage(text: string): Promise<string> {
    if (!this.chatInstance) {
      throw new Error("Chat not initialized. Please upload documents first.");
    }

    try {
      const response = await this.chatInstance.sendMessage({ message: text });
      return response.text || "I'm sorry, I couldn't generate a response.";
    } catch (error) {
      console.error("Gemini API Error:", error);
      const errorMsg = this.extractErrorMessage(error);
      throw new Error(errorMsg);
    }
  }

  async *sendMessageStream(text: string): AsyncGenerator<string> {
    if (!this.chatInstance) {
      throw new Error("Chat not initialized.");
    }

    try {
      const result = await this.chatInstance.sendMessageStream({ message: text });
      for await (const chunk of result) {
        const c = chunk as GenerateContentResponse;
        if (c.text) {
          yield c.text;
        }
      }
    } catch (error) {
      console.error("Gemini Streaming Error:", error);
      const errorMsg = this.extractErrorMessage(error);
      throw new Error(errorMsg);
    }
  }

  async *summarizeDocs(docs: DocumentFile[]): AsyncGenerator<string> {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY || '' });
    const prompt = docs.length === 1 
      ? `Please provide a concise summary of the document titled "${docs[0].name}". Highlight the key points, main arguments, and conclusion. Use bullet points for clarity.`
      : `Please provide a concise collective summary of the following ${docs.length} documents: ${docs.map(d => d.name).join(', ')}. Highlight common themes and unique key points from each.`;

    const content = docs.map(d => `Document: ${d.name}\nContent: ${d.content}`).join('\n\n');

    try {
      if (!import.meta.env.VITE_API_KEY || import.meta.env.VITE_API_KEY === "") {
        throw new Error("Gemini API key is missing or not set.");
      }
      if (!content || content.trim().length === 0) {
        throw new Error("Document content is empty. Cannot summarize.");
      }
      const result = await ai.models.generateContentStream({
        model: MODEL_NAME,
        contents: [
          { role: 'user', parts: [{ text: `${prompt}\n\nDOCUMENT CONTENT:\n${content}` }] }
        ],
        config: {
          temperature: 0.3,
          systemInstruction: "You are an expert at summarizing complex documents into clear, concise, and actionable insights."
        }
      });

      for await (const chunk of result) {
        if (chunk.text) yield chunk.text;
      }
    } catch (error: any) {
      console.error("Summarization Error:", error);
      const errorMsg = this.extractErrorMessage(error);
      throw new Error(errorMsg);
    }
  }

  private extractErrorMessage(error: any): string {
    if (error instanceof Error) {
      const msg = error.message;
      if (msg.includes('401') || msg.includes('UNAUTHENTICATED') || msg.includes('Invalid API key')) {
        return 'Invalid API key. Please check your GEMINI_API_KEY.';
      }
      if (msg.includes('403') || msg.includes('PERMISSION_DENIED')) {
        return 'Permission denied. Check your API key permissions.';
      }
      if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
        return 'Quota exceeded. You have reached the API usage limit. Please check your Gemini account.';
      }
      if (msg.includes('400') || msg.includes('INVALID_ARGUMENT')) {
        return 'Invalid request. Please check your input and try again.';
      }
      if (msg.includes('missing') || msg.includes('not set')) {
        return 'Gemini API key is missing or not set.';
      }
      return msg;
    }
    if (typeof error === 'string') {
      return error;
    }
    return 'An unexpected error occurred. Please try again.';
  }
}

export const ragService = new GeminiRAGService();
