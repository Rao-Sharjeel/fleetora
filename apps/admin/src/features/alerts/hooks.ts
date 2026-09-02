import { useQuery } from "@tanstack/react-query";
import { listAlerts } from "@/services/alerts.service";

export function useAlerts() {
  return useQuery({ queryKey: ["alerts"], queryFn: listAlerts });
}
