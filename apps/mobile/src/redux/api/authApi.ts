import { apiSlice } from './apiSlice';
import {
  AuthUser,
  SignInInput,
  SignUpInput,
  VerifySignupInput,
  ResendVerifyCodeInput,
  ForgotPasswordInput,
  VerifyResetCodeInput,
  ResetPasswordInput,
} from '@medirem/types';

export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  token?: string;
  message?: string;
  error?: string;
}

export interface RegisterResponse {
  success: boolean;
  requiresVerification?: boolean;
  userId?: string;
  email?: string;
  code?: string;
  message?: string;
  error?: string;
}

export interface VerifySignupResponse {
  success: boolean;
  email?: string;
  user?: AuthUser;
  message: string;
  error?: string;
}

export interface GenericMessageResponse {
  success: boolean;
  message: string;
  error?: string;
}

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    signUp: builder.mutation<RegisterResponse, SignUpInput>({
      query: (body) => ({
        url: '/auth/register',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['User'],
    }),

    verifySignup: builder.mutation<VerifySignupResponse, VerifySignupInput>({
      query: (body) => ({
        url: '/auth/verify-signup',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['User'],
    }),

    resendSignupCode: builder.mutation<GenericMessageResponse, ResendVerifyCodeInput>({
      query: (body) => ({
        url: '/auth/resend-verify-code',
        method: 'POST',
        body,
      }),
    }),

    signIn: builder.mutation<AuthResponse, SignInInput>({
      query: (body) => ({
        url: '/auth/login',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['User'],
    }),

    forgotPassword: builder.mutation<GenericMessageResponse, ForgotPasswordInput>({
      query: (body) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body,
      }),
    }),

    verifyResetCode: builder.mutation<GenericMessageResponse, VerifyResetCodeInput>({
      query: (body) => ({
        url: '/auth/verify-code',
        method: 'POST',
        body,
      }),
    }),

    resetPassword: builder.mutation<GenericMessageResponse, ResetPasswordInput>({
      query: (body) => ({
        url: '/auth/reset-password',
        method: 'POST',
        body,
      }),
    }),

    getUserProfile: builder.query<{ success: boolean; user: AuthUser }, string>({
      query: (userId) => `/auth/profile/${userId}`,
      providesTags: ['User'],
    }),
  }),
});

export const {
  useSignUpMutation,
  useVerifySignupMutation,
  useResendSignupCodeMutation,
  useSignInMutation,
  useForgotPasswordMutation,
  useVerifyResetCodeMutation,
  useResetPasswordMutation,
  useGetUserProfileQuery,
} = authApi;

