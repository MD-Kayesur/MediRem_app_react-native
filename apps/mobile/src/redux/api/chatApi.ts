import { apiSlice } from './apiSlice';

export interface ChatMessageRequest {
  message: string;
  userId?: string;
  userEmail?: string;
  conversationHistory?: { sender: 'ai' | 'user'; text: string }[];
}

export interface ChatMessageResponse {
  text: string;
  quickReplies: string[];
  userMedsCount: number;
  provider: string;
  isLiveAi: boolean;
}

export const chatApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    sendChatMessage: builder.mutation<ChatMessageResponse, ChatMessageRequest>({
      query: (body) => ({
        url: '/chat/ask',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const { useSendChatMessageMutation } = chatApi;
