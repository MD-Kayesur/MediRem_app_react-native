import { apiSlice } from './apiSlice';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: 'USER' | 'ADMIN';
  avatarUrl?: string | null;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  medicationsCount?: number;
}

export interface UserProfileResponse {
  success: boolean;
  data: UserProfile;
}

export interface UsersListResponse {
  success: boolean;
  total: number;
  data: UserProfile[];
}

export interface UpdateProfileInput {
  userId?: string;
  name?: string;
  phone?: string;
  avatarUrl?: string;
}

export const userApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getMe: builder.query<UserProfileResponse, string | void>({
      query: (userId) => ({
        url: '/user/me',
        method: 'GET',
        headers: userId ? { 'x-user-id': userId } : {},
      }),
      providesTags: ['User'],
    }),

    updateMe: builder.mutation<UserProfileResponse, UpdateProfileInput>({
      query: ({ userId, ...body }) => ({
        url: '/user/me',
        method: 'PATCH',
        headers: userId ? { 'x-user-id': userId } : {},
        body,
      }),
      invalidatesTags: ['User'],
    }),

    getAllUsers: builder.query<UsersListResponse, void>({
      query: () => ({
        url: '/user',
        method: 'GET',
      }),
      providesTags: ['User'],
    }),

    getUserById: builder.query<UserProfileResponse, string>({
      query: (id) => ({
        url: `/user/${id}`,
        method: 'GET',
      }),
      providesTags: ['User'],
    }),
  }),
});

export const {
  useGetMeQuery,
  useUpdateMeMutation,
  useGetAllUsersQuery,
  useGetUserByIdQuery,
} = userApi;
