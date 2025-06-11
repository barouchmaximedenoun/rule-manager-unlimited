import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import type { RuleUI } from "../types/ruleTypes";
import { getRuleKey } from "../utils/ruleUtils";
import { GripVertical, Loader } from "lucide-react";

import { cn } from "@/lib/utils";

function SortableRow(props: {
  rule: RuleUI;
  index: number;
  onEdit: (rule: RuleUI) => void;
  onDelete: (id: string) => void;
  isSynching: boolean;
  tenantId: string;
}) {
  const { rule, index, onEdit, onDelete, isSynching, tenantId } = props;
  const key = getRuleKey(rule);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    background: isDragging ? "#f0f0f0" : undefined,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell>{rule.displayPriority } - ({rule.priority})</TableCell>
      {tenantId === 'admin' && <TableCell>{rule.tenantId}</TableCell>}
      <TableCell>
        {!rule.isLastRule && !isSynching && (
          <span
            {...attributes}
            {...listeners}
            className="cursor-grab"
            style={{ display: "inline-flex", alignItems: "center" }}
          >
            <GripVertical size={16} />
          </span>
        )}
      </TableCell>
      <TableCell>{rule.action}</TableCell>
      <TableCell>{rule.name}</TableCell>
      <TableCell>
        {(rule.sources ?? []).map((s) => (
          <div key={s.email}>
            {s.name} ({s.email})
          </div>
        ))}
      </TableCell>
      <TableCell>
        {(rule.destinations ?? []).map((d) => (
          <div key={d.email}>
            {d.name} ({d.email})
          </div>
        ))}
      </TableCell>
      <TableCell>
        {!rule.isLastRule && (
          <>
            <Button onClick={() => onEdit(rule)} disabled={isSynching} className="mr-2">Edit</Button>
            <Button onClick={() => onDelete(key)} disabled={isSynching} variant="destructive">Delete</Button>
          </>
        )}
      </TableCell>
    </TableRow>
  );
}

interface RuleTableProps {
  rules: RuleUI[];
  onMoveRule: (fromIdx: number, toIdx: number) => void;
  onEditRule: (rule: RuleUI) => void;
  onDeleteRule: (id: string) => void;
  isSynching: boolean;
  tenantId: string; // Added tenantId prop for admin view
}

export function RuleTable({
  rules,
  onMoveRule,
  onEditRule,
  onDeleteRule,
  isSynching,
  tenantId, // Added tenantId prop for admin view
}: RuleTableProps) {
  const sensors = useSensors(useSensor(PointerSensor));

  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = rules.findIndex((r) => getRuleKey(r) === active.id);
      const newIndex = rules.findIndex((r) => getRuleKey(r) === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onMoveRule(oldIndex, newIndex);
      }
    }
  }

  return (
    <>
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Priority</TableHead>
            {tenantId === 'admin' && <TableHead>Tenant</TableHead>}
            <TableHead>Drag</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Sources</TableHead>
            <TableHead>Destinations</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <SortableContext
          items={rules.map(getRuleKey)}
          strategy={verticalListSortingStrategy}
        >
          <TableBody>
            {rules.map((rule, index) => (
              <SortableRow
                key={getRuleKey(rule)}
                rule={rule}
                index={index}
                onEdit={onEditRule}
                onDelete={onDeleteRule}
                isSynching={isSynching}
                tenantId={tenantId} // Pass tenantId
              />
            ))}
          </TableBody>
        </SortableContext>
      </Table>
    </DndContext>
    <div
      className={cn(
        "absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-300 pointer-events-none",
        isSynching ? "opacity-100" : "opacity-0"
      )}
    >
      <div className="bg-white/60 backdrop-blur-sm w-full h-full absolute top-0 left-0" />
      <Loader className="h-8 w-8 animate-spin text-muted-foreground z-10" />
    </div>
    </>
  );
}
