import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";

interface Column {
  header: string;
  accessorKey?: string;
  id?: string;
  cell?: (props: { row: Row }) => React.ReactNode;
  sortable?: boolean;
}

interface Row {
  original: any;
  id: string;
  getValue: (key: string) => any;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  isLoading?: boolean;
  pagination?: boolean;
  pageSize?: number;
  serverSidePagination?: {
    totalItems: number;
    currentPage: number;
    onPageChange: (page: number) => void;
  };
  serverSideSorting?: {
    sortKey: string | null;
    sortDirection: 'asc' | 'desc' | null;
    onSortChange: (key: string, direction: 'asc' | 'desc' | null) => void;
  };
}

export default function DataTable({
  columns,
  data,
  isLoading = false,
  pagination = true,
  pageSize = 10,
  serverSidePagination,
  serverSideSorting,
}: DataTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(serverSideSorting?.sortKey || null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(serverSideSorting?.sortDirection || null);

  // Calculate total pages for client-side pagination
  const totalPages = serverSidePagination 
    ? Math.ceil(serverSidePagination.totalItems / pageSize) 
    : Math.ceil(data.length / pageSize);

  // Sort data (only for client-side sorting)
  const sortedData = useMemo(() => {
    if (!sortKey || serverSideSorting) return data;
    
    return [...data].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];
      
      if (aValue === bValue) return 0;
      
      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : 1;
      } else {
        return aValue > bValue ? -1 : 1;
      }
    });
  }, [data, sortKey, sortDirection, serverSideSorting]);

  // Get current page data for client-side pagination
  const getCurrentPageData = () => {
    if (serverSidePagination) return sortedData;
    
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  };

  // Handle sorting
  const handleSort = (key: string) => {
    if (serverSideSorting) {
      // For server-side sorting
      let newDirection: 'asc' | 'desc' | null = 'asc';
      
      if (sortKey === key) {
        if (sortDirection === 'asc') newDirection = 'desc';
        else if (sortDirection === 'desc') newDirection = null;
      }
      
      serverSideSorting.onSortChange(key, newDirection);
    } else {
      // For client-side sorting
      let newDirection: 'asc' | 'desc' | null = 'asc';
      
      if (sortKey === key) {
        if (sortDirection === 'asc') newDirection = 'desc';
        else if (sortDirection === 'desc') newDirection = null;
      }
      
      setSortKey(newDirection === null ? null : key);
      setSortDirection(newDirection);
    }
  };

  // Pagination handlers
  const handlePreviousPage = () => {
    const newPage = currentPage - 1;
    if (serverSidePagination) {
      serverSidePagination.onPageChange(newPage);
    } else if (currentPage > 1) {
      setCurrentPage(newPage);
    }
  };

  const handleNextPage = () => {
    const newPage = currentPage + 1;
    if (serverSidePagination) {
      serverSidePagination.onPageChange(newPage);
    } else if (currentPage < totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handlePageClick = (page: number) => {
    if (serverSidePagination) {
      serverSidePagination.onPageChange(page);
    } else {
      setCurrentPage(page);
    }
  };

  // Generate pagination buttons
  const getPaginationButtons = () => {
    const buttons = [];
    const maxButtons = 5;
    const current = serverSidePagination ? serverSidePagination.currentPage : currentPage;
    
    let startPage = Math.max(1, current - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);

    if (endPage - startPage + 1 < maxButtons) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }
    
    // Add page buttons
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <Button
          key={i}
          variant={current === i ? "default" : "outline"}
          size="sm"
          onClick={() => handlePageClick(i)}
          className="h-8 w-8 p-0"
        >
          {i}
        </Button>
      );
    }
    
    return buttons;
  };

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead 
                  key={column.id || column.accessorKey} 
                  className={`font-medium text-xs uppercase tracking-wider bg-neutral-50 py-3 ${column.sortable ? 'cursor-pointer group' : ''}`}
                  onClick={() => column.sortable && column.accessorKey && handleSort(column.accessorKey)}
                >
                  <div className="flex items-center">
                    {column.header}
                    {column.sortable && column.accessorKey && (
                      <div className="ml-2">
                        {sortKey === column.accessorKey ? (
                          sortDirection === 'asc' ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : sortDirection === 'desc' ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : null
                        ) : (
                          <div className="opacity-0 group-hover:opacity-50 h-4 w-4 flex flex-col items-center">
                            <ChevronUp className="h-2 w-4" />
                            <ChevronDown className="h-2 w-4" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  {columns.map((column, colIndex) => (
                    <TableCell key={colIndex}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Không có dữ liệu
                </TableCell>
              </TableRow>
            ) : (
              (pagination && !serverSidePagination ? getCurrentPageData() : sortedData).map((row, rowIndex) => {
                const processedRow: Row = {
                  original: row,
                  id: row.id?.toString() || rowIndex.toString(),
                  getValue: (key: string) => row[key],
                };
                
                return (
                  <TableRow key={processedRow.id}>
                    {columns.map((column, colIndex) => (
                      <TableCell key={colIndex}>
                        {column.cell
                          ? column.cell({ row: processedRow })
                          : column.accessorKey
                          ? processedRow.getValue(column.accessorKey)
                          : null}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && data.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-2">
          <div className="text-sm text-neutral-medium text-center sm:text-left">
            {serverSidePagination ? (
              <>
                Hiển thị <span className="font-medium">{Math.min(1 + (serverSidePagination.currentPage - 1) * pageSize, serverSidePagination.totalItems)}</span> đến{" "}
                <span className="font-medium">{Math.min(serverSidePagination.currentPage * pageSize, serverSidePagination.totalItems)}</span> trong số{" "}
                <span className="font-medium">{serverSidePagination.totalItems}</span> kết quả
              </>
            ) : (
              <>
                Hiển thị <span className="font-medium">{Math.min(1 + (currentPage - 1) * pageSize, data.length)}</span> đến{" "}
                <span className="font-medium">{Math.min(currentPage * pageSize, data.length)}</span> trong số{" "}
                <span className="font-medium">{data.length}</span> kết quả
              </>
            )}
          </div>
          <div className="flex space-x-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={serverSidePagination ? serverSidePagination.currentPage === 1 : currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Show fewer page buttons on mobile */}
            <div className="hidden sm:flex">
              {getPaginationButtons()}
            </div>
            
            {/* Simplified page indicator for mobile */}
            <div className="flex sm:hidden">
              <Button variant="outline" size="sm" className="pointer-events-none">
                {serverSidePagination ? serverSidePagination.currentPage : currentPage} / {totalPages}
              </Button>
            </div>

            {totalPages > 5 && (
              <div className="hidden sm:flex">
                {(serverSidePagination ? serverSidePagination.currentPage : currentPage) < totalPages - 3 && (
                  <Button variant="outline" size="sm" disabled className="h-8 w-8 p-0">
                    ...
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageClick(totalPages)}
                  className="h-8 w-8 p-0"
                >
                  {totalPages}
                </Button>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={serverSidePagination ? serverSidePagination.currentPage === totalPages : currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}