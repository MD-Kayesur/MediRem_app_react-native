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

export interface UserQueryArg {
  userId?: string;
  userEmail?: string;
}

export interface UpdateProfileInput {
  userId?: string;
  userEmail?: string;
  name?: string;
  phone?: string;
  avatarUrl?: string;
}

export const userApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getMe: builder.query<UserProfileResponse, UserQueryArg | string | void>({
      query: (arg) => {
        const userId = typeof arg === 'string' ? arg : arg?.userId;
        const userEmail = typeof arg === 'object' && arg !== null ? arg.userEmail : undefined;
        const headers: Record<string, string> = {};
        if (userId) headers['x-user-id'] = userId;
        if (userEmail) headers['x-user-email'] = userEmail;
        return {
          url: '/user/me',
          method: 'GET',
          headers,
          params: {
            ...(userId ? { userId } : {}),
            ...(userEmail ? { userEmail } : {}),
          },
        };
      },
      providesTags: ['User'],
    }),

    updateMe: builder.mutation<UserProfileResponse, UpdateProfileInput>({
      query: ({ userId, userEmail, ...body }) => {
        const headers: Record<string, string> = {};
        if (userId) headers['x-user-id'] = userId;
        if (userEmail) headers['x-user-email'] = userEmail;
        return {
          url: '/user/me',
          method: 'PATCH',
          headers,
          params: {
            ...(userId ? { userId } : {}),
            ...(userEmail ? { userEmail } : {}),
          },
          body,
        };
      },
      invalidatesTags: ['User'],
    }),

    changePassword: builder.mutation<
      { success: boolean; message: string },
      { userId?: string; userEmail?: string; currentPassword?: string; newPassword: string }
    >({
      query: ({ userId, userEmail, ...body }) => {
        const headers: Record<string, string> = {};
        if (userId) headers['x-user-id'] = userId;
        if (userEmail) headers['x-user-email'] = userEmail;
        return {
          url: '/user/change-password',
          method: 'POST',
          headers,
          params: {
            ...(userId ? { userId } : {}),
            ...(userEmail ? { userEmail } : {}),
          },
          body,
        };
      },
      invalidatesTags: ['User'],
    }),

    getAllUsers: builder.query<UsersListResponse, { adminId?: string; adminEmail?: string } | void>({
      query: (arg) => {
        const headers: Record<string, string> = {};
        if (arg?.adminId) headers['x-user-id'] = arg.adminId;
        if (arg?.adminEmail) headers['x-user-email'] = arg.adminEmail;
        return {
          url: '/user',
          method: 'GET',
          headers,
        };
      },
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
  useChangePasswordMutation,
  useGetAllUsersQuery,
  useGetUserByIdQuery,
} = userApi;

