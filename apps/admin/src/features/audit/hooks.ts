import { useQuery } from "@tanstack/react-query";
import { listAuditLog } from "@/services/audit.service";

export function useAuditLog() {
  return useQuery({ queryKey: ["audit"], queryFn: listAuditLog });
}
