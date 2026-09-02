import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createKioskDevice,
  deleteKioskDevice,
  listKioskDevices,
  updateKioskDevice,
} from "@/services/kiosk-devices.service";

export function useKioskDevices() {
  return useQuery({ queryKey: ["kiosk-devices"], queryFn: listKioskDevices });
}

export function useCreateKioskDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createKioskDevice(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["kiosk-devices"] }),
  });
}

export function useUpdateKioskDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<{ name: string; active: boolean }> }) =>
      updateKioskDevice(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["kiosk-devices"] }),
  });
}

export function useDeleteKioskDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteKioskDevice(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["kiosk-devices"] }),
  });
}
