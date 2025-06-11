// Pagination.tsx
import React from "react";
import { Button } from "@/components/ui/button"; // Assure-toi que ce chemin correspond à ton projet

type PaginationProps = {
  pageSize: number;
  setPageSize: (size: number) => void;
  totalRulesCount: number;
  currentPage: number;
  handlePrevPage: () => void;
  handleNextPage: () => void;
  isSyncing: boolean;
};

export const Pagination: React.FC<PaginationProps> = ({
  pageSize,
  setPageSize,
  totalRulesCount,
  currentPage,
  handlePrevPage,
  handleNextPage,
  isSyncing,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalRulesCount / pageSize));

  return (
    <div className="mt-4 flex justify-between items-center">
      <div className="mt-2">
        <label>
          Rules per page:{" "}
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="ml-2 p-1 border rounded"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="ml-4">Total Rules: {totalRulesCount}</label>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={handlePrevPage} disabled={currentPage === 1 || isSyncing}>
          Previous Page
        </Button>
        <span>
          Page {currentPage} / {totalPages}
        </span>
        <Button
          onClick={handleNextPage}
          disabled={isSyncing || totalRulesCount <= currentPage * pageSize}
        >
          Next Page
        </Button>
      </div>
    </div>
  );
};
