import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ContactsAPI from '@/services/contacts';

const QUERY_KEYS = {
  contacts: ['contacts'],
  contactTypes: ['contactTypes']
};

export function useContacts(page: number, sortBy: string, typeFilter: string, archived: string, search: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.contacts, page, sortBy, typeFilter, archived, search],
    queryFn: () => ContactsAPI.getContacts(page, sortBy, typeFilter, archived, search)
  });
}

export function useContactsBySearch(search: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.contacts, 'search', search],
    queryFn: () => ContactsAPI.getContactsBySearch(search)
  });
}

export function useContactTypes() {
  return useQuery({
    queryKey: [...QUERY_KEYS.contactTypes],
    queryFn: () => ContactsAPI.getContactTypes()
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contact: FormData) => ContactsAPI.createContact(contact),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contacts });
    },
    onError: (error) => {
      console.error('Error creating contact:', error);
    }
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      contactId,
      contact
    }: {
      contactId: string;
      contact: FormData;
    }) => ContactsAPI.updateContact(contactId, contact),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contacts });
    },
    onError: (error) => {
      console.error('Error updating contact:', error);
    }
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ContactsAPI.deleteContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contacts });
    },
    onError: (error) => {
      console.error('Error deleting contact:', error);
    }
  });
}

export function useArchiveContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      return ContactsAPI.archiveContact(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contacts });
    },
    onError: (error) => {
      console.error('Error archiving contact:', error);
    }
  });
}
