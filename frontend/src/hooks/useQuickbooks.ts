import { QuickbooksService } from '@/services/quickbooks';
import { AccountMapping } from '@/types/quickbooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const queryKeys = {
  classes: ['quickbooks-classes'],
  accounts: ['quickbooks-accounts'],
  status: ['quickbooks-status'],
  mappings: ['quickbooks-mappings']
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

export const useQuickbooksMappings = () => {
  return useQuery({
    queryKey: queryKeys.mappings,
    queryFn: () => QuickbooksService.getMappings()
  });
};

export const useQuickbooksSaveMapping = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mapping: AccountMapping) =>
      QuickbooksService.saveMapping(mapping),
    onSuccess: () => {
      console.log('Mapping saved successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.mappings });
    },
    onError: (error) => {
      console.error(error);
    }
  });
};
