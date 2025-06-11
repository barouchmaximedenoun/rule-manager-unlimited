import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { RuleTable } from "@/features/rules/components/RuleTable";
import { RuleDialog } from "@/features/rules/components/RuleDialog";
import { useRuleHandlers } from "@/features/rules/hooks/useRuleHandlers";
import DummyRulesGenerator from "./features/rules/components/DummyRuleGenerator";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "./hooks/useAuth";
import axios from "axios";
import Login from "./features/login/components/Login";


export default function App() {
  const { tenantId, login, logout, loading } = useAuth();


  const {
    visibleRules, error, dialogError, dialogOpen, ruleForm, editTarget, 
    isSyncing, currentPage, setCurrentPage, pageSize, setPageSize,
    hasPendingChanges, hasMaxPendingChanges,
    loadPage, setDialogOpen,
    handleEditRule, handleDeleteRule, handleMoveRule,
    handleAddRuleClick, handleRuleFormChange,
    handleAddSource, handleAddDestination, handleDialogSave,
    handleSaveChanges, handleClearChanges,
    handlePrevPage, handleNextPage, totalRulesCount
  } = useRuleHandlers();

  const prevPageRef = useRef<number | null>(null);
  const prevPageSizeRef = useRef<number | null>(null);

  const restartPage = () => {
    prevPageRef.current = null;
    prevPageSizeRef.current = null;
    if(currentPage === 1 && pageSize === 25) {
      loadPage(null, currentPage, null, pageSize);
    } // Only reset if not already at default
    setCurrentPage(1);
    setPageSize(25); // Reset to default page size
  };

  useEffect(() => {
    restartPage();
  }, [tenantId]); 

  useEffect(() => {
    const prevPage = prevPageRef.current;
    prevPageRef.current = currentPage;
    const prevPageSize = prevPageSizeRef.current;
    prevPageSizeRef.current = pageSize;
    loadPage(prevPage, currentPage, prevPageSize, pageSize);
  }, [currentPage, loadPage, pageSize]);

  const handleLogout = async () => {
    await axios.post("/api/logout", {}, { withCredentials: true });
    logout();
  };

  if (loading) return <div>Loading...</div>; 

  if (!tenantId) {
    return <Login login={login} />;
  }

  return (
  <div className="m-8">
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Welcome {tenantId}</h1>
        <Button variant="outline" onClick={handleLogout}>Logout</Button>
      </div>
      <div className="text-l">Security Rules Manager for {tenantId}</div>
        
      {error && <div style={{ color: "red" }}>{error}</div>}

      <DummyRulesGenerator restartPage={restartPage} tenantId={tenantId}/>

      <div className="mt-4 space-x-2">
        <Button onClick={() => handleAddRuleClick(tenantId)} disabled={hasMaxPendingChanges() || isSyncing}>
          Add Rule
        </Button>
        <Button onClick={handleSaveChanges} disabled={!hasPendingChanges() || isSyncing}>
          Save Changes
        </Button>
        <Button onClick={handleClearChanges} disabled={!hasPendingChanges() || isSyncing}>
          Clear Changes
        </Button>
      </div>

      <RuleTable
        rules={visibleRules}
        onEditRule={handleEditRule}
        onDeleteRule={handleDeleteRule}
        onMoveRule={handleMoveRule}
        isSyncing={isSyncing}
        tenantId={tenantId} // Pass tenantId for admin view
        currentPage={currentPage}
        pageSize={pageSize}
        setPageSize={setPageSize}
        totalRulesCount={totalRulesCount}
        handlePrevPage={handlePrevPage}
        handleNextPage={handleNextPage}
      />
      {/* <div className="mt-4 flex justify-between">
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
            <label className="ml-4">
              Total Rules: {totalRulesCount}
            </label>
          </div>
          <div>
            <Button onClick={handlePrevPage} disabled={currentPage === 1 || isSyncing}>
              Previous Page
            </Button>
            <span> Page {currentPage} / {Math.ceil(totalRulesCount / pageSize)} </span>
            <Button onClick={handleNextPage} disabled={isSyncing|| totalRulesCount < (currentPage * pageSize)}>
              Next Page
            </Button>
          </div>
        </div> */}
        <RuleDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          rule={ruleForm ?? { tenantId: `${tenantId}`, name: "", action: "Allow", displayPriority: 1, sources: [], destinations: [] }}
          onChange={handleRuleFormChange}
          onAddSource={handleAddSource}
          onAddDestination={handleAddDestination}
          onSave={handleDialogSave}
          isEdit={!!editTarget}
          error={dialogError} 
          minPriority={1}
          maxPriority={1_000_000} // Adjust as needed
          tenantId={tenantId} // Pass tenantId for admin view
        />
      </div>
    <Toaster />
  </div>
  );
}
