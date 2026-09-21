import { useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Ban } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTrips, useCancelTripPlan } from "@/features/trips/hooks";
import { TripPlanDialog } from "@/features/trips/components/trip-plan-dialog";
import { formatDateTime, formatKm } from "@/lib/formatters";
import { useCan } from "@/hooks/use-session";
import type { Trip } from "@/types";

const TABS: { value: string; label: string; statuses: Trip["status"][] | null }[] = [
  { value: "all", label: "All", statuses: null },
  { value: "planned", label: "Planned", statuses: ["planned"] },
  { value: "open", label: "Out", statuses: ["open"] },
  { value: "completed", label: "Completed", statuses: ["completed"] },
  { value: "cancelled", label: "Cancelled", statuses: ["cancelled"] },
];

export function TripRegisterPage() {
  const { data: trips = [], isLoading } = useTrips();
  const cancelPlan = useCancelTripPlan();
  const can = useCan();
  const canEdit = can("trips.edit");

  async function handleCancel(trip: Trip) {
    if (!window.confirm(`Cancel the plan for ${trip.tripNumber}?`)) return;
    const reason = window.prompt("Reason (optional):") ?? undefined;
    try {
      await cancelPlan.mutateAsync({ id: trip.id, reason });
      toast.success(`${trip.tripNumber} cancelled.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel the plan.");
    }
  }

  const columns: ColumnDef<Trip>[] = [
    { accessorKey: "tripNumber", header: "Trip #" },
    { accessorKey: "vehicleRegistrationNumber", header: "Vehicle" },
    { accessorKey: "driverName", header: "Driver" },
    { accessorKey: "purpose", header: "Purpose" },
    { accessorKey: "destination", header: "Destination" },
    {
      id: "when",
      header: "Out Time",
      cell: ({ row }) => {
        const trip = row.original;
        if (trip.outTime) return formatDateTime(trip.outTime);
        if (trip.plannedOutTime) return `Planned: ${formatDateTime(trip.plannedOutTime)}`;
        return "—";
      },
    },
    {
      accessorKey: "tripKm",
      header: "Trip KM",
      cell: ({ getValue }) => formatKm(getValue<number | null | undefined>()),
    },
    {
      accessorKey: "effectiveStatus",
      header: "Status",
      meta: { skeleton: "badge" },
      cell: ({ getValue }) => <StatusBadge status={getValue<Trip["effectiveStatus"]>()} />,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const trip = row.original;
        if (trip.status !== "planned" || !canEdit) return null;
        return (
          <div className="flex justify-end gap-1">
            <TripPlanDialog mode="edit" trip={trip} />
            <Button variant="ghost" size="icon" onClick={() => handleCancel(trip)} aria-label="Cancel plan">
              <Ban className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Trip Register"
        description="Every trip, planned by the Transport Incharge and confirmed at the gate."
        actions={can("trips.create") && <TripPlanDialog mode="add" />}
      />
      <Tabs defaultValue="planned">
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.map((t) => (
          <TabsContent key={t.value} value={t.value}>
            <TripTable trips={trips} statuses={t.statuses} isLoading={isLoading} columns={columns} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function TripTable({
  trips,
  statuses,
  isLoading,
  columns,
}: {
  trips: Trip[];
  statuses: Trip["status"][] | null;
  isLoading: boolean;
  columns: ColumnDef<Trip>[];
}) {
  const filtered = useMemo(
    () => (statuses ? trips.filter((t) => statuses.includes(t.status)) : trips),
    [trips, statuses],
  );
  return (
    <DataTable
      columns={columns}
      data={filtered}
      searchPlaceholder="Search by trip, vehicle, driver or destination…"
      isLoading={isLoading}
    />
  );
}
