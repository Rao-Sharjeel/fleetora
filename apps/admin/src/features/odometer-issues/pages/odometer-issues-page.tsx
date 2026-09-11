import { useState } from "react";
import { Gauge, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { CardGridSkeleton } from "@/components/shared/card-grid-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOdometerIssues, useResolveOdometerIssue } from "@/features/odometer-issues/hooks";
import { formatDateTime, formatKm } from "@/lib/formatters";
import type { OdometerIssue } from "@/types";

const STAGE_LABEL: Record<OdometerIssue["stage"], string> = {
  gate_out: "Gate-Out",
  gate_in: "Gate-In",
  fuel: "Fuel Entry",
};

/**
 * Readings guards could not get scanned, for an admin to enter from the photo.
 *
 * Guards deliberately cannot type odometer readings themselves — a typed
 * number is the thing scanning exists to remove — so an unreadable cluster is
 * photographed at the gate and lands here. The vehicle is never held up; its
 * odometer simply stays at the last known-good value until one of these is
 * resolved.
 */
export function OdometerIssuesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Fix Odo Readings"
        description="Odometers that couldn't be read at the gate. Enter the reading from the photo."
      />
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Needs a reading</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
        </TabsList>
        <TabsContent value="pending">
          <IssueList status="pending" />
        </TabsContent>
        <TabsContent value="resolved">
          <IssueList status="resolved" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function IssueList({ status }: { status: "pending" | "resolved" }) {
  const { data: issues = [], isLoading } = useOdometerIssues(status);

  if (isLoading) return <CardGridSkeleton count={3} lines={3} />;
  if (issues.length === 0) {
    return (
      <EmptyState
        icon={Gauge}
        title={status === "pending" ? "Nothing waiting on a reading." : "Nothing resolved yet."}
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {issues.map((issue) => (
        <IssueCard key={issue.id} issue={issue} />
      ))}
    </div>
  );
}

function IssueCard({ issue }: { issue: OdometerIssue }) {
  const resolve = useResolveOdometerIssue();
  const [reading, setReading] = useState("");

  const value = Number(reading);
  // Mirrors the backend rule, so an impossible reading is caught before a
  // round trip rather than coming back as a validation error.
  const belowFloor = reading.trim() !== "" && value < issue.lastKnownOdometer;
  const canSave = reading.trim() !== "" && Number.isFinite(value) && !belowFloor;

  async function save() {
    try {
      await resolve.mutateAsync({ id: issue.id, reading: value });
      toast.success(`${issue.registrationNumber} set to ${formatKm(value)}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save the reading.");
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold">{issue.registrationNumber}</p>
            <p className="text-sm text-muted-foreground">
              {STAGE_LABEL[issue.stage]}
              {issue.tripNumber && ` · ${issue.tripNumber}`}
              {` · ${formatDateTime(issue.raisedAt)}`}
            </p>
          </div>
          <Badge variant={issue.status === "pending" ? "warning" : "success"} dot={false}>
            {issue.status === "pending" ? "Needs a reading" : "Resolved"}
          </Badge>
        </div>

        {issue.photoUrl ? (
          <a href={issue.photoUrl} target="_blank" rel="noreferrer" className="group relative block">
            <img
              src={issue.photoUrl}
              alt={`Odometer for ${issue.registrationNumber}`}
              className="max-h-72 w-full rounded-lg border border-border bg-muted object-contain"
            />
            <span className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-background/80 px-2 py-1 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
              <ExternalLink className="h-3 w-3" /> Full size
            </span>
          </a>
        ) : (
          <p className="text-sm text-muted-foreground">No photo was attached.</p>
        )}

        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <span>Last recorded: {formatKm(issue.lastKnownOdometer)}</span>
          <span>{issue.attempts} scan attempt(s) at the gate</span>
          {issue.raisedByName && <span>Reported by {issue.raisedByName}</span>}
        </div>

        {issue.status === "pending" ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label
                  htmlFor={`reading-${issue.id}`}
                  className="mb-1 block text-xs font-medium text-muted-foreground"
                >
                  Odometer reading from the photo
                </label>
                <Input
                  id={`reading-${issue.id}`}
                  inputMode="numeric"
                  placeholder={`e.g. ${issue.lastKnownOdometer + 120}`}
                  value={reading}
                  onChange={(e) => setReading(e.target.value.replace(/[^0-9]/g, ""))}
                />
              </div>
              <Button onClick={save} disabled={!canSave} loading={resolve.isPending} loadingText="Saving…">
                Save reading
              </Button>
            </div>
            {belowFloor && (
              <span className="text-xs text-destructive">
                Must be at or above the last recorded reading ({formatKm(issue.lastKnownOdometer)}).
              </span>
            )}
          </div>
        ) : (
          <p className="text-sm">
            Set to <span className="font-semibold">{formatKm(issue.reading)}</span>
            {issue.resolvedByName && ` by ${issue.resolvedByName}`}
            {issue.resolvedAt && ` · ${formatDateTime(issue.resolvedAt)}`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
