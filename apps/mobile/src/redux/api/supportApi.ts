import { apiSlice } from './apiSlice';
import { SupportMessage, SupportThread, SendSupportMessageInput } from '@medirem/types';

export interface ThreadMessagesResponse {
  success: boolean;
  threadUserId: string;
  total: number;
  data: SupportMessage[];
}

export interface AdminThreadsResponse {
  success: boolean;
  total: number;
  data: SupportThread[];
}

export interface UnreadBadgeResponse {
  success: boolean;
  role: 'USER' | 'ADMIN';
  unreadCount: number;
}

export const supportApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSupportMessages: builder.query<ThreadMessagesResponse, string | undefined>({
      query: (targetUserId) => ({
        url: '/support/thread',
        params: targetUserId ? { userId: targetUserId } : undefined,
      }),
      providesTags: ['SupportMessages'],
    }),

    sendSupportMessage: builder.mutation<
      { success: boolean; data: SupportMessage },
      SendSupportMessageInput
    >({
      query: (body) => ({
        url: '/support/message',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['SupportMessages', 'SupportThreads'],
    }),

    getAdminThreads: builder.query<AdminThreadsResponse, void>({
      query: () => '/support/admin/threads',
      providesTags: ['SupportThreads'],
    }),

    getUnreadSupportCount: builder.query<UnreadBadgeResponse, void>({
      query: () => '/support/unread-count',
      providesTags: ['SupportMessages'],
    }),
  }),
});

export const {
  useGetSupportMessagesQuery,
  useSendSupportMessageMutation,
  useGetAdminThreadsQuery,
  useGetUnreadSupportCountQuery,
} = supportApi;

