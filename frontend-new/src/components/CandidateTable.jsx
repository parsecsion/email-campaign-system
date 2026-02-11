import React, { useState, useMemo, useEffect } from "react";
import {
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table";
import {
    ArrowUpDown,
    ChevronDown,
    MoreHorizontal,
    Search,
    Trash2,
    Edit,
    UserPlus,
    Filter,
    Columns3,
    ListFilter,
    CircleX,
    Trash
} from "lucide-react";


import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuGroup,
    DropdownMenuShortcut
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

// Internal component
function CandidateTableComponent({ data, type, onEdit, onDelete, onDeleteCount, disablePagination = false, searchQuery, onSearch, isLoading = false, onPrefetch }) {
    const [sorting, setSorting] = useState([]);
    // ... (rest of the component logic is fine, we just renamed the function)
    const [columnFilters, setColumnFilters] = useState([]);
    const [columnVisibility, setColumnVisibility] = useState({});
    const [rowSelection, setRowSelection] = useState({});
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 10,
    });
    const filteredData = data;

    const columns = useMemo(() => {
        const cols = [
            {
                id: "select",
                header: ({ table }) => (
                    <Checkbox
                        checked={
                            table.getIsAllPageRowsSelected() ||
                            (table.getIsSomePageRowsSelected() && "indeterminate")
                        }
                        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                        aria-label="Select all"
                    />
                ),
                cell: ({ row }) => (
                    <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(value) => row.toggleSelected(!!value)}
                        aria-label="Select row"
                    />
                ),
                enableSorting: false,
                enableHiding: false,
            },
            {
                accessorKey: "first_name",
                header: ({ column }) => {
                    return (
                        <Button
                            variant="ghost"
                            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                            className="pl-0 hover:bg-transparent"
                        >
                            Name
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                    );
                },
                cell: ({ row }) => (
                    <div className="font-medium">
                        {row.original.first_name} {row.original.last_name}
                    </div>
                ),
            },
            {
                accessorKey: "email",
                header: ({ column }) => {
                    return (
                        <Button
                            variant="ghost"
                            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                            className="pl-0 hover:bg-transparent"
                        >
                            Email
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                    );
                },
                cell: ({ row }) => <div className="lowercase">{row.getValue("email")}</div>,
            },
            {
                accessorKey: "phone",
                header: ({ column }) => {
                    return (
                        <Button
                            variant="ghost"
                            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                            className="pl-0 hover:bg-transparent"
                        >
                            Phone
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                    );
                },
                cell: ({ row }) => <div>{row.getValue("phone") || "-"}</div>,
            },
        ];

        // Always add Address and Citizenship columns, but they might be empty for US
        // Or we can conditionally hide them if we really want to, but user asked to check why they are empty.
        // Let's add them to the main columns array directly or via push
        cols.push({
            accessorKey: "address",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="pl-0 hover:bg-transparent"
                    >
                        Address
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => <div>{row.getValue("address") || "-"}</div>,
        });

        cols.push({
            accessorKey: "citizenship",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="pl-0 hover:bg-transparent"
                    >
                        Citizenship
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                );
            },
            cell: ({ row }) => <div>{row.getValue("citizenship") || "-"}</div>,
        });

        cols.push({
            id: "actions",
            enableHiding: false,
            cell: ({ row }) => {
                const candidate = row.original;

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                                onClick={() => navigator.clipboard.writeText(candidate.email)}
                            >
                                Copy email
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onEdit(candidate)}>Edit details</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDelete(candidate.id)} className="text-red-600 focus:text-red-600">
                                Delete candidate
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        });

        return cols;
    }, [type, onEdit, onDelete]);

    const table = useReactTable({
        data: filteredData,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        // onGlobalFilterChange: setGlobalFilter, // Handled by parent
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: disablePagination ? undefined : getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        onPaginationChange: setPagination,
        getRowId: row => String(row.id), // Ensure stable IDs
        manualFiltering: true, // Server-side filtering
        state: {
            sorting,
            columnFilters,
            // globalFilter,
            columnVisibility,
            rowSelection,
            pagination
        },
    });

    const handleDeleteSelected = () => {
        const selectedIds = table.getFilteredSelectedRowModel().rows.map(row => row.original.id);
        if (onDeleteCount) onDeleteCount(selectedIds);
        setRowSelection({});
    };

    // Local search state for instant typing response
    const [localSearch, setLocalSearch] = useState(searchQuery || "");

    // Sync local state if prop changes externaly (e.g. clear button in parent)
    useEffect(() => {
        setLocalSearch(searchQuery || "");
    }, [searchQuery]);

    // Debounce the parent update
    useEffect(() => {
        const timer = setTimeout(() => {
            if (onSearch && localSearch !== searchQuery) {
                onSearch(localSearch);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [localSearch, onSearch, searchQuery]);

    // Prefetch next page on hover
    const handleNextHover = () => {
        if (onPrefetch && table.getCanNextPage()) {
            // onPrefetch(pagination.pageIndex + 2) logic explained in prev comments
            onPrefetch(pagination.pageIndex + 2);
        }
    };

    return (
        <div className="w-full">
            <div className="flex items-center py-4 gap-2">
                <div className="relative max-w-sm w-full">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search candidates..."
                        value={localSearch}
                        onChange={(event) => setLocalSearch(event.target.value)}
                        className="pl-8 pr-8"
                    />
                    {localSearch && (
                        <button
                            onClick={() => {
                                setLocalSearch("");
                                if (onSearch) onSearch("");
                            }}
                            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                        >
                            <CircleX className="h-4 w-4" />
                        </button>
                    )}
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="ml-auto">
                            Columns <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {table
                            .getAllColumns()
                            .filter((column) => column.getCanHide())
                            .map((column) => {
                                return (
                                    <DropdownMenuCheckboxItem
                                        key={column.id}
                                        className="capitalize"
                                        checked={column.getIsVisible()}
                                        onCheckedChange={(value) =>
                                            column.toggleVisibility(!!value)
                                        }
                                    >
                                        {column.id}
                                    </DropdownMenuCheckboxItem>
                                );
                            })}
                    </DropdownMenuContent>
                </DropdownMenu>

                {Object.keys(rowSelection).length > 0 && (
                    <Button
                        variant="default" // Use default (usually black in this theme) or custom class
                        size="sm"
                        onClick={handleDeleteSelected}
                        className="ml-2 bg-red-600 text-white hover:bg-red-700 transition-colors"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete ({Object.keys(rowSelection).length})
                    </Button>
                )}
            </div>
            <div className="rounded-md border bg-white shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.24)] relative min-h-[400px]">
                {isLoading && (
                    <div className="absolute inset-0 bg-white z-50 flex flex-col pt-12 animate-in fade-in duration-200">
                        {/* Header Faker */}
                        <div className="flex items-center px-4 h-10 border-b bg-gray-50/50">
                            {[1, 2, 3, 4, 5].map((_, i) => (
                                <div key={i} className={`h-4 bg-gray-200 rounded animate-pulse ${i === 2 ? 'w-1/3' : 'w-24'} mr-4`} />
                            ))}
                        </div>
                        {/* Skeleton Rows */}
                        <div className="flex-1 overflow-hidden">
                            {Array.from({ length: table.getState().pagination.pageSize }).map((_, i) => (
                                <div key={i} className="flex items-center px-4 h-16 w-full border-b border-gray-100">
                                    <div className="w-4 h-4 rounded bg-gray-200 animate-pulse mr-6 shrink-0" /> {/* Checkbox */}
                                    <div className="flex-1 space-y-2 mr-4">
                                        <div className="w-1/3 h-4 rounded bg-gray-200 animate-pulse" /> {/* Name */}
                                        <div className="w-1/4 h-3 rounded bg-gray-100 animate-pulse" /> {/* Email subtext ? */}
                                    </div>
                                    <div className="w-1/6 h-4 rounded bg-gray-100 animate-pulse hidden md:block mr-4" /> {/* Phone */}
                                    <div className="w-1/6 h-4 rounded bg-gray-100 animate-pulse hidden lg:block mr-4" /> {/* Address */}
                                    <div className="w-20 h-6 rounded-full bg-gray-100 animate-pulse ml-auto" /> {/* Type/Action */}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                    className="data-row cursor-pointer"
                                    onClick={(e) => {
                                        if (e.target.closest('button') || e.target.closest('[role="checkbox"]')) return;
                                        row.toggleSelected(!row.getIsSelected());
                                    }}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            {!disablePagination && (
                <div className="flex items-center justify-between py-4">
                    <div className="flex flex-1 items-center space-x-6 lg:space-x-8">
                        <div className="text-sm text-muted-foreground whitespace-nowrap">
                            {table.getFilteredSelectedRowModel().rows.length} of{" "}
                            {table.getFilteredRowModel().rows.length} row(s) selected.
                        </div>
                        <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium">Rows per page</p>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="h-8 w-[70px]">
                                        {table.getState().pagination.pageSize} <ChevronDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {[10, 20, 30, 40, 50].map((pageSize) => (
                                        <DropdownMenuItem
                                            key={pageSize}
                                            onClick={() => table.setPageSize(Number(pageSize))}
                                        >
                                            {pageSize}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                            Page {table.getState().pagination.pageIndex + 1} of{" "}
                            {table.getPageCount()}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.nextPage()}
                            onMouseEnter={handleNextHover}
                            disabled={!table.getCanNextPage()}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )
            }
        </div >
    );
}

// Export memoized component as the default/named export
export const CandidateTable = React.memo(CandidateTableComponent);

