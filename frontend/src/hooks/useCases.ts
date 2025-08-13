import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import CasesAPI from '@/services/cases';
import { ApiResponse } from './useDocuments';
import { CaseType, FolderTemplate } from '@/types/cases';

// Define the actual API response structure
interface CaseTypesResponse {
  caseTypes: CaseType[];
}

const QUERY_KEYS = {
  caseTypes: ['caseTypes'] as const,
  cases: ['cases'] as const,
  case: ['case'] as const,
  tasks: ['tasks'] as const,
  folders: ['folders'] as const,
  events: ['events'] as const
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

export function useCaseType(caseTypeId: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.caseTypes, caseTypeId],
    queryFn: async () => {
      const response = await CasesAPI.getCaseType(caseTypeId);
      return response;
    },
    enabled: !!caseTypeId,
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

export function useGetCases(
  type: string,
  page: number,
  search?: string,
  statusFilter?: string,
  sortBy?: string,
  order?: string
) {
  return useQuery({
    queryKey: [
      ...QUERY_KEYS.cases,
      type,
      page,
      search,
      statusFilter,
      sortBy,
      order
    ],
    queryFn: async () => {
      const response = await CasesAPI.getCases(
        type,
        page,
        search,
        statusFilter,
        sortBy,
        order
      );
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

export function useGetCaseTasks(caseId: string, page: number) {
  return useQuery({
    queryKey: [...QUERY_KEYS.tasks, caseId, page],
    queryFn: async () => {
      const response = await CasesAPI.getCaseTasks(caseId, page);
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

export function useUpdateCaseTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      caseId,
      taskId,
      formData
    }: {
      caseId: string;
      taskId: string;
      formData: any;
    }) => {
      const response = await CasesAPI.updateCaseTask(caseId, taskId, formData);
      return response;
    },
    onSuccess: (_, { caseId }) => {
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.tasks, caseId]
      });
    },
    onError: (error) => {
      console.error('Case task update failed:', error);
    }
  });
}

export function useDeleteCaseTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      caseId,
      taskId
    }: {
      caseId: string;
      taskId: string;
    }) => {
      const response = await CasesAPI.deleteCaseTask(caseId, taskId);
      return response;
    },
    onSuccess: (_, { caseId }) => {
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.tasks, caseId]
      });
    },
    onError: (error) => {
      console.error('Case task deletion failed:', error);
    }
  });
}

export function useUpdateCaseType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      caseTypeId,
      caseType
    }: {
      caseTypeId: string;
      caseType: any;
    }) => {
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

export function useUpdateFolderTemplates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      caseTypeId,
      formData
    }: {
      caseTypeId: string;
      formData: any;
    }) => {
      const response = await CasesAPI.updateFolderTemplates(
        caseTypeId,
        formData
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.caseTypes] });
    },
    onError: (error) => {
      console.error('Case type folder templates update failed:', error);
    }
  });
}

export function useDeleteFolderTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (templateId: string) => {
      const response = await CasesAPI.deleteFolderTemplate(templateId);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.caseTypes] });
    },
    onError: (error) => {
      console.error('Folder template deletion failed:', error);
    }
  });
}

export function useGetCaseEvents(caseId: string, page: number = 1) {
  return useQuery({
    queryKey: [...QUERY_KEYS.events, caseId, page],
    queryFn: async () => {
      const response = await CasesAPI.getCaseEvents(caseId, page);
      return response;
    },
    enabled: !!caseId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });
}

export function useCasesOperations() {
  return {
    //Queries
    caseTypes: useCaseTypes(),

    //Mutations
    createCase: useCreateCase(),
    updateCase: useUpdateCase(),
    deleteCase: useDeleteCase(),
    createCaseTask: useCreateCaseTask(),
    deleteCaseTask: useDeleteCaseTask(),
    updateCaseTask: useUpdateCaseTask(),
    createCaseType: useCreateCaseType(),
    deleteCaseType: useDeleteCaseType(),
    updateCaseType: useUpdateCaseType(),
    updateFolderTemplates: useUpdateFolderTemplates(),
    deleteFolderTemplate: useDeleteFolderTemplate()
  };
}

// Helper function to get case operations with a specific caseId
export function useCaseOperations(caseId: string) {
  return {
    //Queries
    getCase: useGetCase(caseId),
    getCaseTasks: useGetCaseTasks(caseId, 1),
    getCaseEvents: useGetCaseEvents(caseId)
  };
}
