import { useQuery } from '@tanstack/react-query';
import { MembersAPI } from '@/services/members';

export const useMembers = () => {
  return useQuery({
    queryKey: ['members'],
    queryFn: () => MembersAPI.getMembers(),
    staleTime: 1000 * 60 * 5,
    retry: 2
  });
};
