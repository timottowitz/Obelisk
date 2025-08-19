import { useQuery } from '@tanstack/react-query';
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
