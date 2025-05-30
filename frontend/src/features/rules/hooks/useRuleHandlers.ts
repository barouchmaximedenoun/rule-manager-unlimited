// useRuleHandlers.ts
import { useCallback, useState } from "react";
import type { RuleUI } from "../types/ruleTypes";
import { useRuleManager } from "./useRuleManager";

export function useRuleHandlers() {
  const {
    rules,
    fetchPage,
    addRule,
    editRule,
    deleteRule,
    moveRule,
    saveChanges,
    clearChanges,
    hasPendingChanges,
    hasMaxPendingChanges,
    currentPage,
    pageSize,
    setPageSize,
    setCurrentPage,
  } = useRuleManager();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RuleUI | null>(null);
  const [ruleForm, setRuleForm] = useState<RuleUI | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const minPriority = Math.min(((currentPage - 1) * pageSize) + 1, rules.length);
  const maxPriority = Math.min(currentPage * pageSize, rules.length);
  const visibleRules = rules.slice(0, pageSize);


  const loadPage = useCallback(async (page: number) => {
    console.log("useEffect triggered", currentPage);
    try {
      await fetchPage(page);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, [fetchPage]);

  const handleEditRule = useCallback((rule: RuleUI) => {
    setEditTarget(rule);
    setRuleForm({ ...rule });
    setDialogOpen(true);
  }, []);

  const handleMoveRule = useCallback((fromIdx: number, toIdx: number) => {
    try {
      moveRule(fromIdx, toIdx);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, [moveRule]);

  const handleDeleteRule = useCallback((id: string) => {
    try {
      deleteRule(id);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, [deleteRule]);

  const handleAddRuleClick = useCallback(() => {
    setEditTarget(null);
    setRuleForm({
      tempId: `temp-${Date.now()}`,
      name: "",
      action: "Allow",
      sources: [],
      destinations: [],
      displayPriority: minPriority,
      isLastRule: false,
    });
    setDialogOpen(true);
  }, [minPriority]);

  const handleRuleFormChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, idx?: number, type?: "sources" | "destinations") => {
      if (!ruleForm) return;
      const { name, value, type: inputType } = e.target;
      const parsedValue = inputType === "number" ? Number(value) : value;

      if (typeof idx === "number" && type) {
        const list = [...ruleForm[type]];
        list[idx] = { ...list[idx], [name]: parsedValue };
        setRuleForm({ ...ruleForm, [type]: list });
      } else {
        setRuleForm({ ...ruleForm, [name]: parsedValue });
      }
    },
    [ruleForm]
  );

  const handleAddSource = useCallback(() => {
    if (!ruleForm) return;
    setRuleForm({
      ...ruleForm,
      sources: [...ruleForm.sources, { name: "", email: "" }],
    });
  }, [ruleForm]);

  const handleAddDestination = useCallback(() => {
    if (!ruleForm) return;
    setRuleForm({
      ...ruleForm,
      destinations: [...ruleForm.destinations, { name: "", email: "" }],
    });
  }, [ruleForm]);

  const handleDialogSave = useCallback(() => {
    if (!ruleForm) return;
    try {
      if (editTarget) {
        editRule(ruleForm);
      } else {
        addRule(ruleForm);
      }
      setDialogOpen(false);
      setEditTarget(null);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, [ruleForm, editTarget, editRule, addRule]);

  const handleSaveChanges = useCallback(async () => {
    setIsSaving(true);
    try {
      await saveChanges();
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSaving(false);
    }
  }, [saveChanges]);

  const handleClearChanges = useCallback(() => {
    clearChanges();
    setError(null);
  }, [clearChanges]);

  const handlePrevPage = useCallback(() => {
    if (hasPendingChanges()) {
      alert("Save or clear changes before changing page");
      return;
    }
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  }, [currentPage, hasPendingChanges, setCurrentPage]);

  const handleNextPage = useCallback(() => {
    if (hasPendingChanges()) {
      alert("Save or clear changes before changing page");
      return;
    }
    setCurrentPage(currentPage + 1);
  }, [currentPage, hasPendingChanges, setCurrentPage]);

  return {
    visibleRules,
    error,
    dialogOpen,
    ruleForm,
    editTarget,
    isSaving,
    currentPage,
    pageSize,
    setPageSize,
    minPriority,
    maxPriority,
    hasPendingChanges,
    hasMaxPendingChanges,
    loadPage,
    setDialogOpen,
    handleEditRule,
    handleDeleteRule,
    handleMoveRule,
    handleAddRuleClick,
    handleRuleFormChange,
    handleAddSource,
    handleAddDestination,
    handleDialogSave,
    handleSaveChanges,
    handleClearChanges,
    handlePrevPage,
    handleNextPage,
  };
}
