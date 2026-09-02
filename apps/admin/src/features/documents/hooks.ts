import { useQuery } from "@tanstack/react-query";
import { listDocuments } from "@/services/documents.service";

export function useDocuments() {
  return useQuery({ queryKey: ["documents"], queryFn: listDocuments });
}
