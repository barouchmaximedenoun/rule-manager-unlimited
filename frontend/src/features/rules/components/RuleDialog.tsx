import React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { RuleUI } from "../types/ruleTypes";

interface RuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: RuleUI;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement |HTMLSelectElement>,
    idx?: number,
    type?: "sources" | "destinations"
  ) => void;
  onAddSource: () => void;
  onAddDestination: () => void;
  onSave: () => void;
  isEdit: boolean;
  minPriority: number;
  maxPriority: number;
}

export function RuleDialog({
  open,
  onOpenChange,
  rule,
  onChange,
  onAddSource,
  onAddDestination,
  onSave,
  isEdit,
  minPriority,
  maxPriority,
}: RuleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white">
        <DialogTitle>{isEdit ? "Edit Rule" : "Add Rule"}</DialogTitle>
        <div className="flex flex-col gap-2">
          {/* Priority */}
          <Input
            type="number"
            name="displayPriority"
            placeholder={`Priority (${minPriority}-${maxPriority})`}
            value={rule.displayPriority}
            min={minPriority}
            max={maxPriority}
            onChange={(e) => onChange(e)}
          />

          {/* Action */}
          <select
            name="action"
            value={rule.action}
            onChange={(e) => onChange(e)}
            className="border rounded p-2"
          >
            <option value="Allow">Allow</option>
            <option value="Block">Block</option>
          </select>

          {/* Name */}
          <Input
            name="name"
            placeholder="Name"
            value={rule.name}
            onChange={(e) => onChange(e)}
          />

          {/* Sources */}
          <div>
            <div className="font-semibold">Sources</div>
            {rule.sources.map((src, i) => (
              <div key={i} className="flex gap-2 mb-1">
                <Input
                  name="name"
                  placeholder="Source Name"
                  value={src.name}
                  onChange={(e) => onChange(e, i, "sources")}
                />
                <Input
                  name="email"
                  placeholder="Source Email"
                  value={src.email}
                  onChange={(e) => onChange(e, i, "sources")}
                />
              </div>
            ))}
            <Button variant="outline" onClick={onAddSource}>
              Add Source
            </Button>
          </div>

          {/* Destinations */}
          <div>
            <div className="font-semibold">Destinations</div>
            {rule.destinations.map((dst, i) => (
              <div key={i} className="flex gap-2 mb-1">
                <Input
                  name="name"
                  placeholder="Destination Name"
                  value={dst.name}
                  onChange={(e) => onChange(e, i, "destinations")}
                />
                <Input
                  name="email"
                  placeholder="Destination Email"
                  value={dst.email}
                  onChange={(e) => onChange(e, i, "destinations")}
                />
              </div>
            ))}
            <Button variant="outline" onClick={onAddDestination}>
              Add Destination
            </Button>
          </div>

          <Button onClick={onSave}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
