import { chatApiClient } from "./api/chatClient";

export interface AskDataRequest {
  question: string;
  model: null;
  temperature_sql: number;
  temperature_answer: number;
}

export interface AskDataResponse {
  answer: string;
  sql_executed: string;
  row_count: number;
  rows_sample: Record<string, unknown>[];
  security_blocked?: boolean;
}

export const chatService = {
  async sendMessage(userText: string): Promise<AskDataResponse> {
    const body: AskDataRequest = {
      question: userText,
      model: null,
      temperature_sql: 0.1,
      temperature_answer: 0.3,
    };

    const response = await chatApiClient.post<AskDataResponse>(
      "/api/chat/ask-data",
      body
    );
    return response.data;
  },
};
