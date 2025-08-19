import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExpensesService } from '@/services/expenses';

const QUERY_KEYS = {
  expenseTypes: ['expenseTypes'],
  initialDocuments: ['initialDocuments']
};

export const useExpenseTypes = () => {
  return useQuery({
    queryKey: [...QUERY_KEYS.expenseTypes],
    queryFn: () => ExpensesService.getExpenseTypes()
  });
};

export const useInitialDocuments = (caseId: string) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.initialDocuments, caseId],
    queryFn: () => ExpensesService.getInitialDocuments(caseId)
  });
};

export const useCreateExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, payload }: { caseId: string; payload: FormData }) =>
      ExpensesService.createExpense(caseId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.expenseTypes] });
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.initialDocuments]
      });
    },
    onError: (error) => {
      console.error(error);
    }
  });
};
