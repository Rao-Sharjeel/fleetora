import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";

/** Small labeled stat/fact tile used across entity profile pages (Vehicle, Driver, Guard). */
export function InfoCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 text-lg font-semibold capitalize">{value}</CardContent>
    </Card>
  );
}

/** A titled card listing related records (trips, fuel entries, documents, ...) on an
 * entity profile page, with a consistent empty state. */
export function ListCard<T>({
  title,
  items,
  empty,
  render,
}: {
  title: string;
  items: T[];
  empty: string;
  render: (item: T) => React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {items.length === 0 && <EmptyState title={empty} />}
        {items.map((item, i) => (
          <div key={i} className="rounded-md border border-border p-3 text-sm">
            {render(item)}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
