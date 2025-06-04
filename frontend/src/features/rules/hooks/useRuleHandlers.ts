// useRuleHandlers.ts
import { useCallback, useMemo, useState } from "react";
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
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const minDisplayPriority = useMemo(() => ((currentPage - 1) * pageSize) + 1, [currentPage, pageSize]);
  const visibleRules = rules.slice(0, pageSize);


  const loadPage = useCallback(async (prevPage: number | undefined, page: number) => {
    try {
      await fetchPage(prevPage, page);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, [fetchPage]);

  const handleEditRule = useCallback((rule: RuleUI) => {
    setDialogError(null);
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

  const handleDeleteRule = useCallback(async (id: string) => {
    try {
      await deleteRule(id);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, [deleteRule]);

  const handleAddRuleClick = useCallback(() => {
    setDialogError(null);
    setEditTarget(null);
    setRuleForm({
      tempId: `temp-${Date.now()}`,
      name: "",
      action: "Allow",
      sources: [],
      destinations: [],
      displayPriority: minDisplayPriority,
      isLastRule: false,
    });
    setDialogOpen(true);
  }, [minDisplayPriority]);

  const handleRuleFormChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, idx?: number, type?: "sources" | "destinations") => {
      if (!ruleForm) return;
      setDialogError(null);
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

  const handleDialogSave = useCallback(async () => {
    if (!ruleForm) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Trim name
    const trimmedName = ruleForm.name.trim();
    if (!trimmedName) {
      setDialogError("Rule name is required.");
      return;
    }

    const validSources = ruleForm.sources.filter(s => s.email.trim());
      if (validSources.length === 0) {
        setDialogError("At least one source must have an email.");
        return;
      }
      if (validSources.some(s => !emailRegex.test(s.email.trim()))) {
        setDialogError("One or more source emails are invalid.");
        return;
      }

      const validDestinations = ruleForm.destinations.filter(d => d.email.trim());
      if (validDestinations.length === 0) {
        setDialogError("At least one destination must have an email.");
        return;
      }
      if (validDestinations.some(d => !emailRegex.test(d.email.trim()))) {
        setDialogError("One or more destination emails are invalid.");
        return;
      }

      try {
        const cleanedForm = {
          ...ruleForm,
          name: trimmedName,
          sources: ruleForm.sources.map(s => ({ ...s, email: s.email.trim() })),
          destinations: ruleForm.destinations.map(d => ({ ...d, email: d.email.trim() })),
        };

        if (editTarget) {
          await editRule(cleanedForm);
        } else {
          await addRule(cleanedForm);
        }
        setDialogOpen(false);
        setEditTarget(null);
        setDialogError(null);
      } catch (e: any) {
        setDialogError(e.message);
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

  const handleClearChanges = useCallback(async () => {
    await clearChanges();
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
    dialogError,
    dialogOpen,
    ruleForm,
    editTarget,
    isSaving,
    currentPage,
    pageSize,
    setPageSize,
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
