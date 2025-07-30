import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import CasesAPI from '@/services/cases';
import { ApiResponse } from './useDocuments';
import { useParams } from 'next/navigation';

export interface CaseType {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface Case {
  id: string;
  case_number: string;
  status: string;
  full_name: string;
  phone: string;
  email: string;
  case_type: string;
  special_notes: string;
  filing_fee: string;
  claimant: string;
  respondent: string;
  case_manager: string;
  adr_process: string;
  applicable_rules: string;
  track: string;
  claim_amount: string;
  hearing_locale: string;
  created_at: string;
  updated_at: string;
}

// Define the actual API response structure
interface CaseTypesResponse {
  caseTypes: CaseType[];
}

const QUERY_KEYS = {
  caseTypes: ['caseTypes'] as const,
  cases: ['cases'] as const,
  case: ['case'] as const
};

export function useCaseTypes() {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: [...QUERY_KEYS.caseTypes, orgId],
    queryFn: async () => {
      const response = (await CasesAPI.getCaseTypes()) as CaseTypesResponse;
      return response.caseTypes || [];
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });
}

export function useCreateCase() {
  const queryClient = useQueryClient();
  const { orgId } = useAuth();

  return useMutation({
    mutationFn: async (formData: any) => {
      const response = (await CasesAPI.createCase(
        formData
      )) as ApiResponse<any>;
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.cases, orgId] });
    },
    onError: (error) => {
      console.error('Case creation failed:', error);
    }
  });
}

export function useUpdateCase() {
  const queryClient = useQueryClient();
  const { orgId } = useAuth();

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.cases, orgId] });
    },
    onError: (error) => {
      console.error('Case update failed:', error);
    }
  });
}

export function useDeleteCase() {
  const queryClient = useQueryClient();
  const { orgId } = useAuth();

  return useMutation({
    mutationFn: async (caseId: string) => {
      const response = (await CasesAPI.deleteCase(caseId)) as ApiResponse<any>;
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.cases, orgId] });
    },
    onError: (error) => {
      console.error('Case deletion failed:', error);
    }
  });
}

export function useGetCases() {
  const { orgId } = useAuth();
  return useQuery({
    queryKey: [...QUERY_KEYS.cases, orgId],
    queryFn: async () => {
      const response = (await CasesAPI.getCases()) as ApiResponse<any>;
      return response;
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });
}

export function useGetCase(caseId: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.case, caseId],
    queryFn: async () => {
      const response = (await CasesAPI.getCase(caseId)) as ApiResponse<any>;
      return response;
    },
    enabled: !!caseId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
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
    deleteCase: useDeleteCase()
  };
}

// Helper function to get case operations with a specific caseId
export function useCaseOperations(caseId: string) {
  return {
    //Queries
    getCase: useGetCase(caseId)
  };
}
