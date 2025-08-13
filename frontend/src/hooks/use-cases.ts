import { useQuery } from '@tanstack/react-query';
import { Case } from '@/types/cases';
import CasesAPI from '@/services/cases';

export function useCases() {
  return useQuery<Case[]>({
    queryKey: ['cases'],
    queryFn: async () => {
      // Fetch all cases for the dropdown.
      // We assume there won't be thousands of cases. If there are,
      // we might need a more sophisticated search/select component.
      const response = await CasesAPI.getCases('all', 1, undefined, undefined, 'case_number', 'asc');
      return response.cases;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1
  });
}
