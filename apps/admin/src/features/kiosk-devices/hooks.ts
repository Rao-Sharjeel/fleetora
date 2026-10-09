import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createKioskDevice,
  deleteKioskDevice,
  listKioskDevices,
  reissueKioskDevice,
  updateKioskDevice,
  type KioskApp,
} from "@/services/kiosk-devices.service";

export function useKioskDevices() {
  return useQuery({ queryKey: ["kiosk-devices"], queryFn: listKioskDevices });
}

export function useCreateKioskDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, apps }: { name: string; apps: KioskApp[] }) => createKioskDevice(name, apps),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["kiosk-devices"] }),
  });
}

export function useUpdateKioskDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<{ name: string; apps: KioskApp[]; active: boolean }> }) =>
      updateKioskDevice(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["kiosk-devices"] }),
  });
}

export function useReissueKioskDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reissueKioskDevice(id),
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
