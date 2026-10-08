import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listOdometerIssues, resolveOdometerIssue } from "@/services/odometer-issues.service";

export function useOdometerIssues(status?: "pending" | "resolved") {
  return useQuery({
    queryKey: ["odometer-issues", status ?? "all"],
    queryFn: () => listOdometerIssues(status),
  });
}

export function useResolveOdometerIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reading }: { id: string; reading: number }) => resolveOdometerIssue(id, reading),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["odometer-issues"] });
      // The resolution moves the vehicle's odometer and fills in the trip, so
      // anything showing either is now stale.
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      // ["fuel"], not ["fuel-entries"] — that is the key useFuelEntries uses,
      // so the old spelling silently matched nothing and the Fuel page kept
      // showing the null odometer this resolution just filled in.
      queryClient.invalidateQueries({ queryKey: ["fuel"] });
    },
  });
}
