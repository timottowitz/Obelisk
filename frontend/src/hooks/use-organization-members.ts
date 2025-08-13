import { useQuery } from '@tanstack/react-query';
import { OrganizationMember } from '@/types/callcaps';
import { getAuthHeaders } from '@/config/api';

export function useOrganizationMembers() {
  return useQuery<OrganizationMember[]>({
    queryKey: ['organization-members'],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `https://rnmjwdxqtsvsbelcftzg.supabase.co/functions/v1/members`,
        { headers }
      );
      if (!response.ok) throw new Error('Failed to fetch members');
      const data = await response.json();
      return data.members;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1
  });
}
