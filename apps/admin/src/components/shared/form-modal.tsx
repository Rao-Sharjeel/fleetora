import { useMemo, useState, type ReactNode, type Ref } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useScrollSpy } from "@/hooks/use-scroll-spy";
import { DialogTitle, DialogDescription } from "@/components/ui/dialog";

export interface FormModalSection {
  id: string;
  label: string;
  icon: LucideIcon;
}

export function useFormModalScrollSpy(sections: FormModalSection[]) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const ids = useMemo(() => sections.map((s) => s.id), [sections]);
  const activeId = useScrollSpy(ids, container);
  return { containerRef: setContainer, activeId };
}

export function FormModalHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-border px-8 py-5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <DialogTitle className="text-xl">{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </div>
    </div>
  );
}

export function FormModalNav({ sections, activeId }: { sections: FormModalSection[]; activeId: string }) {
  return (
    <nav className="hidden w-60 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-border bg-muted/30 p-3 lg:flex">
      {sections.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          onClick={(e) => {
            e.preventDefault();
            document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors",
            activeId === s.id
              ? "bg-primary/10 font-medium text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <s.icon className="h-4 w-4 shrink-0" />
          {s.label}
        </a>
      ))}
    </nav>
  );
}

export function FormModalBody({
  containerRef,
  children,
}: {
  containerRef: Ref<HTMLDivElement>;
  children: ReactNode;
}) {
  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-6 py-6 sm:px-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-10">{children}</div>
    </div>
  );
}

export function FormModalFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex shrink-0 flex-col-reverse items-center justify-end gap-2 border-t border-border bg-card px-8 py-4 sm:flex-row">
      {children}
    </div>
  );
}

export function FormSection({
  id,
  icon: Icon,
  title,
  description,
  columns = 2,
  children,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  description?: string;
  columns?: 1 | 2;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-4">
      <div className="mb-4 flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      <div className={cn("grid gap-4", columns === 2 && "sm:grid-cols-2")}>{children}</div>
    </section>
  );
}
