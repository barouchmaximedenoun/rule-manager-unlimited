import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RuleTable } from "@/features/rules/components/RuleTable";
import { RuleDialog } from "@/features/rules/components/RuleDialog";
import { useRuleHandlers } from "@/features/rules/hooks/useRuleHandlers";
import DummyRulesGenerator from "./features/rules/components/DummyRuleGenerator";
import { Toaster } from "@/components/ui/toaster";

export default function App() {
  const {
    visibleRules, error, dialogOpen, ruleForm, editTarget, isSaving,
    currentPage, pageSize, setPageSize, minPriority, maxPriority,
    hasPendingChanges, hasMaxPendingChanges,
    loadPage, setDialogOpen,
    handleEditRule, handleDeleteRule, handleMoveRule,
    handleAddRuleClick, handleRuleFormChange,
    handleAddSource, handleAddDestination, handleDialogSave,
    handleSaveChanges, handleClearChanges,
    handlePrevPage, handleNextPage,
  } = useRuleHandlers();

  useEffect(() => {
    loadPage(currentPage);
  }, [currentPage, loadPage]);

  return (
  <div className="m-8">
    <div>
      <h1>Security Rules Manager</h1>
      {error && <div style={{ color: "red" }}>{error}</div>}

      <DummyRulesGenerator />

      <div className="mt-4 space-x-2">
        <Button onClick={handleAddRuleClick} disabled={hasMaxPendingChanges()}>
          Add Rule
        </Button>
        <Button onClick={handleSaveChanges} disabled={!hasPendingChanges() || isSaving}>
          Save Changes
        </Button>
        <Button onClick={handleClearChanges} disabled={!hasPendingChanges()}>
          Clear Changes
        </Button>
      </div>

      <RuleTable
        rules={visibleRules}
        onEditRule={handleEditRule}
        onDeleteRule={handleDeleteRule}
        onMoveRule={handleMoveRule}
      />
      <div className="mt-4 flex justify-between">
          <div className="mt-2">
            <label>
              Rules per page:{" "}
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="ml-2 p-1 border rounded"
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
          </div>
        <div>
          <Button onClick={handlePrevPage} disabled={currentPage === 1 || hasPendingChanges()}>
            Previous Page
          </Button>
          <span> Page {currentPage} </span>
          <Button onClick={handleNextPage} disabled={hasPendingChanges()}>
            Next Page
          </Button>
        </div>
      </div>

      <RuleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        rule={ruleForm ?? { name: "", action: "Allow", displayPriority: 1, sources: [], destinations: [] }}
        onChange={handleRuleFormChange}
        onAddSource={handleAddSource}
        onAddDestination={handleAddDestination}
        onSave={handleDialogSave}
        isEdit={!!editTarget}
        minPriority={minPriority}
        maxPriority={maxPriority}
      />
    </div>
    <Toaster />
  </div>
  );
}
