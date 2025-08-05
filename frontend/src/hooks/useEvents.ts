import EventsAPI from '@/services/events';
import { useQuery } from '@tanstack/react-query';

export function useEvents(page: number) {
  return useQuery({
    queryKey: ['events', page],
    queryFn: () => EventsAPI.getEvents(page),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });
}
