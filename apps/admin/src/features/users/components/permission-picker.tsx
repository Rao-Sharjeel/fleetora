import { useMemo, useState } from "react";
import { Lock, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { PermissionCode, PermissionGroup } from "@/types";

const resourceOf = (code: PermissionCode) => code.split(".")[0];
const isView = (code: PermissionCode) => code.endsWith(".view");

/**
 * Adds or removes one permission, keeping the "any action implies view" rule
 * the backend applies: ticking "Edit drivers" ticks "View drivers", and
 * unticking "View drivers" unticks everything else on drivers.
 */
function toggle(selected: Set<PermissionCode>, code: PermissionCode, on: boolean, all: Set<PermissionCode>) {
  const next = new Set(selected);
  const view = `${resourceOf(code)}.view`;
  if (on) {
    next.add(code);
    if (all.has(view)) next.add(view);
  } else {
    next.delete(code);
    if (isView(code)) {
      for (const other of next) if (resourceOf(other) === resourceOf(code)) next.delete(other);
    }
  }
  return next;
}

interface PermissionPickerProps {
  groups: PermissionGroup[] | undefined;
  value: PermissionCode[];
  onChange: (value: PermissionCode[]) => void;
  /** Already granted elsewhere (the user's role): shown ticked and can't be removed here. */
  locked?: PermissionCode[];
  isLoading?: boolean;
}

export function PermissionPicker({ groups = [], value, onChange, locked = [], isLoading }: PermissionPickerProps) {
  const [query, setQuery] = useState("");
  const selected = useMemo(() => new Set(value), [value]);
  const lockedSet = useMemo(() => new Set(locked), [locked]);
  const all = useMemo(() => new Set(groups.flatMap((g) => g.permissions.map((p) => p.codename))), [groups]);

  const q = query.trim().toLowerCase();
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      permissions:
        !q || group.label.toLowerCase().includes(q)
          ? group.permissions
          : group.permissions.filter((p) => p.label.toLowerCase().includes(q) || p.codename.includes(q)),
    }))
    .filter((group) => group.permissions.length > 0);

  const has = (code: PermissionCode) => selected.has(code) || lockedSet.has(code);

  function setOne(code: PermissionCode, on: boolean) {
    // A view the role already grants can't be the reason to strip extras.
    if (!on && isView(code) && lockedSet.has(code)) return;
    onChange([...toggle(selected, code, on, all)].filter((c) => !lockedSet.has(c)).sort());
  }

  function setGroup(group: PermissionGroup, on: boolean) {
    let next = new Set(selected);
    for (const p of group.permissions) {
      if (on) next.add(p.codename);
      else next.delete(p.codename);
    }
    if (on) next = new Set([...next].flatMap((c) => (all.has(`${resourceOf(c)}.view`) ? [c, `${resourceOf(c)}.view`] : [c])));
    onChange([...next].filter((c) => !lockedSet.has(c)).sort());
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  const total = [...all].filter(has).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search permissions…"
            className="pl-8"
          />
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {total} of {all.size} granted
        </span>
      </div>

      <div className="flex max-h-[45vh] flex-col gap-2 overflow-y-auto pr-1">
        {visibleGroups.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">No permissions match “{query}”.</p>
        )}
        {visibleGroups.map((group) => {
          const granted = group.permissions.filter((p) => has(p.codename)).length;
          const allOn = granted === group.permissions.length;
          const allLocked = group.permissions.every((p) => lockedSet.has(p.codename));
          return (
            <fieldset key={group.key} className="rounded-lg border border-border">
              <legend className="sr-only">{group.label}</legend>
              <label className="flex cursor-pointer items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
                <Checkbox
                  checked={allOn ? true : granted > 0 ? "indeterminate" : false}
                  disabled={allLocked}
                  onCheckedChange={(checked) => setGroup(group, checked === true)}
                  aria-label={`All ${group.label} permissions`}
                />
                <span className="text-sm font-medium">{group.label}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {granted}/{group.permissions.length}
                </span>
              </label>
              <div className="grid gap-x-4 gap-y-1.5 px-3 py-2 sm:grid-cols-2">
                {group.permissions.map((p) => {
                  const isLocked = lockedSet.has(p.codename);
                  return (
                    <label
                      key={p.codename}
                      className={cn(
                        "flex items-center gap-2 text-sm",
                        isLocked ? "cursor-default text-muted-foreground" : "cursor-pointer",
                      )}
                      title={isLocked ? "Granted by the role" : p.codename}
                    >
                      <Checkbox
                        checked={has(p.codename)}
                        disabled={isLocked}
                        onCheckedChange={(checked) => setOne(p.codename, checked === true)}
                      />
                      <span className="min-w-0 truncate">{p.label}</span>
                      {isLocked && <Lock className="h-3 w-3 shrink-0" aria-label="From role" />}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
      </div>
    </div>
  );
}
