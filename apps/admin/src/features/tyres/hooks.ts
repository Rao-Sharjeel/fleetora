import { useQuery } from "@tanstack/react-query";
import { listTyres } from "@/services/tyres.service";

export function useTyres() {
  return useQuery({ queryKey: ["tyres"], queryFn: listTyres });
}
