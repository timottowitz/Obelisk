import TasksAPI from '@/services/tasks';
import { useQuery } from '@tanstack/react-query';

export const useTasks = (page: number) => {
  return useQuery({
    queryKey: ['tasks', page],
    queryFn: () => TasksAPI.getTasks(page),
    staleTime: 1000 * 60 * 5,
    retry: 2
  });
};
