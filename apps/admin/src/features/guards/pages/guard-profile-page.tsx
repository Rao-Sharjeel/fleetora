import { useNavigate, useParams } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { InfoCard, ListCard } from "@/components/shared/profile-cards";
import { useGuard, useDeleteGuard } from "@/features/guards/hooks";
import { GuardFormDialog } from "@/features/guards/components/guard-form-dialog";
import { useTrips } from "@/features/trips/hooks";
import { useMasterCollection } from "@/features/master-data/hooks";
import { useSession } from "@/hooks/use-session";
import { formatDateTime, formatKm } from "@/lib/formatters";
import { ProfileSkeleton } from "@/components/shared/profile-skeleton";

export function GuardProfilePage() {
  const { guardId } = useParams<{ guardId: string }>();
  const navigate = useNavigate();
  const role = useSession((s) => s.role);
  const { data: guard, isLoading } = useGuard(guardId);
  const { data: trips = [] } = useTrips();
  const { data: gates = [] } = useMasterCollection("gates");
  const deleteGuard = useDeleteGuard();

  if (isLoading) return <ProfileSkeleton tabs={3} />;
  if (!guard) return <p className="text-sm text-muted-foreground">Guard not found.</p>;

  const canWrite = role === "admin";
  const guardTrips = trips.filter((t) => t.guardId === guard.id);
  const completedTrips = guardTrips.filter((t) => t.status === "completed");
  const openTrips = guardTrips.filter((t) => t.status === "open");
  const assignedGate = gates.find((g) => g.id === guard.assignedGateId);

  async function handleDelete() {
    if (!guard) return;
    if (!window.confirm(`Delete "${guard.name}"? This can't be undone.`)) return;
    try {
      await deleteGuard.mutateAsync(guard.id);
      toast.success(`${guard.name} deleted.`);
      navigate("/guards");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete guard.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={guard.photoUrl} alt={guard.name} />
            <AvatarFallback>{guard.name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">{guard.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {guard.guardId} · {guard.guardType}
              {guard.department && ` · ${guard.department}`}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant={guard.status === "active" ? "success" : "muted"} dot={false}>
            {guard.status === "active" ? "Active" : "Inactive"}
          </Badge>
          {canWrite && (
            <>
              <GuardFormDialog mode="edit" guard={guard} />
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                loading={deleteGuard.isPending}
                loadingText="Deleting…"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
          <TabsTrigger value="trips">Trips</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="h-48 w-48 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
              {guard.photoUrl ? (
                <img src={guard.photoUrl} alt={guard.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-5xl font-semibold text-muted-foreground">
                  {guard.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <InfoCard title="Company ID" value={guard.companyIdCode} />
              <InfoCard title="CNIC" value={guard.cnic} />
              <InfoCard title="Mobile" value={guard.mobile} />
              <InfoCard title="Guard Type" value={guard.guardType} />
              {guard.department && <InfoCard title="Department" value={guard.department} />}
              {guard.dutyShift && <InfoCard title="Duty Shift" value={guard.dutyShift} />}
              <InfoCard title="Assigned Gate" value={assignedGate?.name ?? "Unassigned"} />
              <InfoCard
                title="Gate Authorization"
                value={
                  [guard.authorizedExit && "Exit", guard.authorizedIn && "In"].filter(Boolean).join(" / ") || "None"
                }
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="stats">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoCard title="Total Trips Supervised" value={`${guardTrips.length}`} />
            <InfoCard title="Completed Trips" value={`${completedTrips.length}`} />
            <InfoCard title="Open Trips" value={`${openTrips.length}`} />
          </div>
        </TabsContent>

        <TabsContent value="trips">
          <ListCard
            title="Trip History"
            items={guardTrips}
            empty="No trips recorded for this guard yet."
            render={(t) => (
              <>
                <p className="font-medium">
                  {t.tripNumber} · {t.purpose} → {t.destination}
                </p>
                <p className="text-muted-foreground">
                  {formatDateTime(t.outTime)} {t.tripKm != null && `· ${formatKm(t.tripKm)}`}
                </p>
              </>
            )}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
