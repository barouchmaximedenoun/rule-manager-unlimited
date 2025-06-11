// useRuleHandlers.ts
import { useCallback, useMemo, useState } from "react";
import type { RuleUI } from "../types/ruleTypes";
import { useRuleManager } from "./useRuleManager";
import { runWithSync } from "../utils/syncUtils";

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
    totalRulesCount,
  } = useRuleManager();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RuleUI | null>(null);
  const [ruleForm, setRuleForm] = useState<RuleUI | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  

  const minDisplayPriority = useMemo(() => ((currentPage - 1) * pageSize) + 1, [currentPage, pageSize]);
  const visibleRules = rules.slice(0, pageSize);


  const loadPage = useCallback(async (prevPage: number | null, page: number, prevPageSise: number | null, pageSize: number) => {
    if( prevPage === page && prevPageSise === pageSize) {
      // No need to fetch if the page and size haven't changed
      return;
    }
    const { error } = await runWithSync(setIsSyncing, async () => {
      await fetchPage(prevPage, page, prevPageSise, pageSize);
    });
    if(error) {
      setError(error.message);
    } else {  
      setError(null);
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
    const { error } = await runWithSync(setIsSyncing, async () => {
      await deleteRule(id);
    });
    if(error) {
      setError(error.message);
    } else {  
      setError(null);
    }
  }, [deleteRule]);

  const handleAddRuleClick = useCallback((tenantId: string | null) => {
    setDialogError(null);
    setEditTarget(null);
    setRuleForm({
      tempId: `temp-${Date.now()}`,
      tenantId,
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
      const cleanedForm = {
        ...ruleForm,
        name: trimmedName,
        sources: ruleForm.sources.map(s => ({ ...s, email: s.email.trim() })),
        destinations: ruleForm.destinations.map(d => ({ ...d, email: d.email.trim() })),
      };
      const { error } = await runWithSync(setIsSyncing, async () => {
        if (editTarget) {
          await editRule(cleanedForm);
        }
        else {
          await addRule(cleanedForm);
        }
      });
      if(error) {
        setError(error.message);
      } else {  
        setDialogOpen(false);
        setEditTarget(null);
        setDialogError(null);
      }
  }, [ruleForm, editTarget, editRule, addRule]);

  const handleSaveChanges = useCallback(async () => {
    const { error } = await runWithSync(setIsSyncing, async () => {
      await saveChanges();
    });
    if(error) {
      setError(error.message);
    } else {  
      setError(null);
    }
  }, [saveChanges]);

  const handleClearChanges = useCallback(async () => {
    const { error } = await runWithSync(setIsSyncing, async () => {
      await clearChanges();
    });
    if(error) {
      setError(error.message);
    } else {  
      setError(null);
    }
  }, [clearChanges]);

  const handlePrevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  }, [currentPage, setCurrentPage]);

  const handleNextPage = useCallback(() => {
    setCurrentPage(currentPage + 1);
  }, [currentPage, setCurrentPage]);

  return {
    visibleRules,
    error,
    dialogError,
    dialogOpen,
    ruleForm,
    editTarget,
    isSyncing,
    currentPage,
    setCurrentPage,
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
    totalRulesCount
  };
}
