import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import CasesAPI from '@/services/cases';
import { ApiResponse } from './useDocuments';
import { CaseType } from '@/types/cases';

// Define the actual API response structure
interface CaseTypesResponse {
  caseTypes: CaseType[];
}

const QUERY_KEYS = {
  caseTypes: ['caseTypes'] as const,
  cases: ['cases'] as const,
  case: ['case'] as const,
  tasks: ['tasks'] as const,
  folders: ['folders'] as const
};

export function useCaseTypes() {
  return useQuery({
    queryKey: [...QUERY_KEYS.caseTypes],
    queryFn: async () => {
      const response = (await CasesAPI.getCaseTypes()) as CaseTypesResponse;
      return response.caseTypes || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });
}

export function useCreateCaseType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: any) => {
      const response = await CasesAPI.createCaseType(formData);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.caseTypes] });
    },
    onError: (error) => {
      console.error('Case type creation failed:', error);
    }
  });
}

export function useDeleteCaseType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (caseTypeId: string) => {
      const response = await CasesAPI.deleteCaseType(caseTypeId);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.caseTypes] });
    },
    onError: (error) => {
      console.error('Case type deletion failed:', error);
    }
  });
}

export function useCreateCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: any) => {
      const response = (await CasesAPI.createCase(
        formData
      )) as ApiResponse<any>;
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.cases] });
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.folders] });
    },
    onError: (error) => {
      console.error('Case creation failed:', error);
    }
  });
}

export function useUpdateCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      caseId,
      formData
    }: {
      caseId: string;
      formData: any;
    }) => {
      const response = (await CasesAPI.updateCase(
        caseId,
        formData
      )) as ApiResponse<any>;
      return response;
    },
    onSuccess: (_, { caseId }) => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.cases] });
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.case, caseId] });
    },
    onError: (error) => {
      console.error('Case update failed:', error);
    }
  });
}

export function useDeleteCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (caseId: string) => {
      const response = (await CasesAPI.deleteCase(caseId)) as ApiResponse<any>;
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.cases] });
    },
    onError: (error) => {
      console.error('Case deletion failed:', error);
    }
  });
}

export function useGetCases() {
  return useQuery({
    queryKey: [...QUERY_KEYS.cases],
    queryFn: async () => {
      const response = await CasesAPI.getCases();
      return response;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });
}

export function useGetCase(caseId: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.case, caseId],
    queryFn: async () => {
      const response = await CasesAPI.getCase(caseId);
      return response;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });
}

export function useGetCaseTasks(caseId: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.tasks, caseId],
    queryFn: async () => {
      const response = await CasesAPI.getCaseTasks(caseId);
      return response;
    },
    enabled: !!caseId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });
}

export function useCreateCaseTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      caseId,
      formData
    }: {
      caseId: string;
      formData: any;
    }) => {
      const response = await CasesAPI.createCaseTask(caseId, formData);
      return response;
    },
    onSuccess: (_, { caseId }) => {
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.tasks, caseId]
      });
    },
    onError: (error) => {
      console.error('Case task creation failed:', error);
    }
  });
}

export function useUpdateCaseType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ caseTypeId, caseType }: { caseTypeId: string; caseType: any }) => {
      const response = await CasesAPI.updateCaseType(caseTypeId, caseType);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.caseTypes] });
    },
    onError: (error) => {
      console.error('Case type update failed:', error);
    }
  });
}

export function useCasesOperations() {
  return {
    //QUeries
    caseTypes: useCaseTypes(),

    //Mutations
    createCase: useCreateCase(),
    updateCase: useUpdateCase(),
    getCases: useGetCases(),
    deleteCase: useDeleteCase(),
    createCaseTask: useCreateCaseTask(),
    createCaseType: useCreateCaseType(),
    deleteCaseType: useDeleteCaseType(),
    updateCaseType: useUpdateCaseType()
  };
}

// Helper function to get case operations with a specific caseId
export function useCaseOperations(caseId: string) {
  return {
    //Queries
    getCase: useGetCase(caseId),
    getCaseTasks: useGetCaseTasks(caseId)

    //Mutations
  };
}
