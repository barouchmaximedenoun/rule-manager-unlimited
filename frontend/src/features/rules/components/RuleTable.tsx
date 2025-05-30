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
import { GripVertical } from "lucide-react";

function SortableRow(props: {
  rule: RuleUI;
  index: number;
  onEdit: (rule: RuleUI) => void;
  onDelete: (id: string) => void;
}) {
  const { rule, index, onEdit, onDelete } = props;
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
      <TableCell>
        {!rule.isLastRule && (
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
            <Button onClick={() => onEdit(rule)} className="mr-2">Edit</Button>
            <Button onClick={() => onDelete(key)} variant="destructive">Delete</Button>
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
}

export function RuleTable({
  rules,
  onMoveRule,
  onEditRule,
  onDeleteRule,
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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Priority</TableHead>
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
              />
            ))}
          </TableBody>
        </SortableContext>
      </Table>
    </DndContext>
  );
}
