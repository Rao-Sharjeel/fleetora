import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createDriver, getDriver, listDrivers, type CreateDriverPayload } from "@/services/drivers.service";

export function useDrivers() {
  return useQuery({ queryKey: ["drivers"], queryFn: listDrivers });
}

export function useCreateDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDriverPayload) => createDriver(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["drivers"] }),
  });
}

export function useDriver(id: string | undefined) {
  return useQuery({
    queryKey: ["drivers", id],
    queryFn: () => getDriver(id as string),
    enabled: !!id,
  });
}
