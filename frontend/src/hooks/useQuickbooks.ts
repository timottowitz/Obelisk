import { QuickbooksService } from '@/services/quickbooks';
import { AccountMapping } from '@/types/quickbooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const queryKeys = {
  classes: ['quickbooks-classes'],
  accounts: ['quickbooks-accounts'],
  status: ['quickbooks-status']
};

export const useQuickbooksClasses = () => {
  return useQuery({
    queryKey: queryKeys.classes,
    queryFn: () => QuickbooksService.getClasses()
  });
};

export const useQuickbooksAccounts = () => {
  return useQuery({
    queryKey: queryKeys.accounts,
    queryFn: () => QuickbooksService.getAccounts()
  });
};

export const useQuickbooksStatus = () => {
  return useQuery({
    queryKey: queryKeys.status,
    queryFn: () => QuickbooksService.getStatus()
  });
};

export const useQuickbooksSaveMapping = () => {
  return useMutation({
    mutationFn: (mapping: AccountMapping) =>
      QuickbooksService.saveMapping(mapping),
    onSuccess: () => {
      console.log('Mapping saved successfully');
    },
    onError: (error) => {
      console.error(error);
    }
  });
};
