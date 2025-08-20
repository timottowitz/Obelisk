import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExpensesService } from '@/services/expenses';

const QUERY_KEYS = {
  expenseTypes: ['expenseTypes'],
  initialDocuments: ['initialDocuments'],
  expenses: ['expenses']
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

export const useExpenses = (caseId: string, filterBy: string, filterValue: string, sortBy: string, sortDir: string, page: number) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.expenses, caseId, filterBy, filterValue, sortBy, sortDir, page],
    queryFn: () => ExpensesService.getExpenses(caseId, filterBy, filterValue, sortBy, sortDir, page)
  });
};

export const useCreateExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ caseId, payload }: { caseId: string; payload: FormData }) =>
      ExpensesService.createExpense(caseId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.expenses] });
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEYS.initialDocuments]
      });
    },
    onError: (error) => {
      console.error(error);
    }
  });
};
