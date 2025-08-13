import { API_CONFIG, getAuthHeaders, handleApiResponse } from '@/config/api';
import { OrganizationMember } from '@/types/callcaps';

export const MembersAPI = {
  getMembers: async () => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_CONFIG.MEMBERS_BASE_URL}`, {
      method: 'GET',
      headers
    });
    return handleApiResponse<OrganizationMember[]>(response);
  }
};
