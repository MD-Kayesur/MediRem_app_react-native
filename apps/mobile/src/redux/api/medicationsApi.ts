import { apiSlice } from './apiSlice';
import { Medication, CreateMedicationInput, UpdateMedicationInput } from '@medirem/types';

export const medicationsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getMedications: builder.query<Medication[], string | void>({
      query: (userId) => (userId ? `/medications?userId=${userId}` : '/medications'),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Medications' as const, id })),
              { type: 'Medications', id: 'LIST' },
            ]
          : [{ type: 'Medications', id: 'LIST' }],
    }),

    getMedicationById: builder.query<Medication, string>({
      query: (id) => `/medications/${id}`,
      providesTags: (result, error, id) => [{ type: 'Medications', id }],
    }),

    createMedication: builder.mutation<Medication, CreateMedicationInput>({
      query: (body) => ({
        url: '/medications',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Medications', id: 'LIST' }],
    }),

    updateMedication: builder.mutation<Medication, { id: string; data: UpdateMedicationInput }>({
      query: ({ id, data }) => ({
        url: `/medications/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Medications', id },
        { type: 'Medications', id: 'LIST' },
      ],
    }),

    deleteMedication: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/medications/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Medications', id: 'LIST' }],
    }),

    takeDose: builder.mutation<Medication, string | { id: string; scheduledTime?: string }>({
      query: (arg) => {
        const id = typeof arg === 'string' ? arg : arg.id;
        const scheduledTime = typeof arg === 'string' ? undefined : arg.scheduledTime;
        return {
          url: `/medications/${id}/take-dose`,
          method: 'POST',
          body: scheduledTime ? { scheduledTime } : undefined,
        };
      },
      invalidatesTags: (result, error, arg) => {
        const id = typeof arg === 'string' ? arg : arg.id;
        return [
          { type: 'Medications', id },
          { type: 'Medications', id: 'LIST' },
          'Doses',
        ];
      },
    }),

    getDoseHistory: builder.query<any[], void>({
      query: () => '/doses/history',
      providesTags: ['Doses'],
    }),

    logDose: builder.mutation<any, { medicationId: string; scheduledTime: string; status?: string; note?: string }>({
      query: (body) => ({
        url: '/doses/log',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Doses'],
    }),
  }),
});

export const {
  useGetMedicationsQuery,
  useGetMedicationByIdQuery,
  useCreateMedicationMutation,
  useUpdateMedicationMutation,
  useDeleteMedicationMutation,
  useTakeDoseMutation,
  useGetDoseHistoryQuery,
  useLogDoseMutation,
} = medicationsApi;

