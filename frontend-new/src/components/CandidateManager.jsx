import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, Search, Edit, Trash2, XCircle, Save, UserPlus, FileText, RefreshCw } from 'lucide-react';
import api from '../utils/api';
import { CandidateTable } from './CandidateTable';
import Loader from './ui/Loader';

import Modal from './ui/Modal';
import { useConfirm } from '../hooks/useConfirm';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const CandidateManager = () => {
    // Confirmation Hook
    const { confirm, ConfirmDialog } = useConfirm();

    // Country state
    const [countryFilter, setCountryFilter] = useState('US'); // Default to US, user can switch to All
    const [availableCountries, setAvailableCountries] = useState(['US', 'UK']);

    useEffect(() => {
        // Fetch saved countries on mount
        const loadSettings = async () => {
            try {
                const res = await api.get('/api/settings');
                if (res.data?.settings?.recruitment_countries) {
                    const countries = res.data.settings.recruitment_countries;
                    setAvailableCountries(countries);
                    // If current filter is not in available, reset to first (unless it is All)
                    if (countryFilter !== 'All' && !countries.includes(countryFilter) && countries.length > 0) {
                        setCountryFilter(countries[0]);
                    }
                }
            } catch (error) {
                // console.log("Using default countries");
            }
        };
        loadSettings();
    }, []);

    // Derived type for API (backwards compatibility or logic reuse)
    const type = countryFilter;
    const endpoint = '/api/candidates'; // API endpoints

    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(false);

    // Pagination & Search State
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1); // Reset to page 1 on search
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    // Edit/Add State
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null); // null means adding
    const [saving, setSaving] = useState(false);

    const initialFormState = {
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        address: '',
        citizenship: '',
        notes: '',
        country: countryFilter // Pre-select current tab country
    };

    const [formData, setFormData] = useState(initialFormState);

    // Cache for prefetching
    const cache = React.useRef({});

    // Load candidates with pagination and search


    const loadCandidates = useCallback(async () => {
        setLoading(true);
        try {
            // Check if endpoint already has query params (unlikely but safe)
            const separator = endpoint.includes('?') ? '&' : '?';
            const offset = (page - 1) * limit;
            // distinct handling for 'All' vs specific country
            const countryParam = countryFilter === 'All' ? '' : countryFilter;
            const cacheKey = `${endpoint}${separator}limit=${limit}&offset=${offset}&search=${encodeURIComponent(debouncedSearch)}&country=${encodeURIComponent(countryParam)}`;

            // console.log("Fetching Candidates with URL:", cacheKey); // Debugging

            // Check cache first
            if (cache.current[cacheKey]) {
                setCandidates(cache.current[cacheKey].candidates);
                setTotal(cache.current[cacheKey].total);
                setLoading(false);
                return;
            }

            const res = await api.get(cacheKey);

            // Update cache
            cache.current[cacheKey] = {
                candidates: res.data.candidates || [],
                total: res.data.total || 0,
                timestamp: Date.now()
            };

            setCandidates(res.data.candidates || []);
            setTotal(res.data.total || 0);
        } catch (error) {
            console.error('Failed to load candidates:', error);
            // toast.error('Failed to load candidates'); 
        } finally {
            setLoading(false);
        }
    }, [endpoint, page, limit, debouncedSearch, countryFilter]);

    const prefetchPage = useCallback(async (pageNumber) => {
        const separator = endpoint.includes('?') ? '&' : '?';
        const offset = (pageNumber - 1) * limit;
        const countryParam = countryFilter === 'All' ? '' : countryFilter;
        const cacheKey = `${endpoint}${separator}limit=${limit}&offset=${offset}&search=${encodeURIComponent(debouncedSearch)}&country=${encodeURIComponent(countryParam)}`;

        if (cache.current[cacheKey]) return; // Already cached

        try {
            const res = await api.get(cacheKey);
            cache.current[cacheKey] = {
                candidates: res.data.candidates || [],
                total: res.data.total || 0,
                timestamp: Date.now()
            };
        } catch (err) {
            console.error('Prefetch failed', err);
        }
    }, [endpoint, limit, debouncedSearch, countryFilter]);

    useEffect(() => {
        loadCandidates();
    }, [loadCandidates]); // Reload when type changes

    const handleAdd = useCallback(() => {
        setEditingId(null);
        setFormData(initialFormState);
        setShowModal(true);
    }, [initialFormState]);

    const handleEdit = useCallback((candidate) => {
        // console.log("Editing Candidate:", candidate); // DEBUG
        setEditingId(candidate.id);
        const newFormData = {
            first_name: candidate.first_name || '',
            last_name: candidate.last_name || '',
            email: candidate.email || '',
            phone: candidate.phone || '',
            address: candidate.address || '',
            citizenship: candidate.citizenship || '',
            country: candidate.country || availableCountries[0] || 'US', // Ensure fallback
            notes: candidate.notes || ''
        };
        // console.log("Form Data Init:", newFormData); // DEBUG
        setFormData(newFormData);
        setShowModal(true);
    }, [availableCountries]);

    const handleDelete = useCallback(async (id) => {
        if (!await confirm({ title: 'Delete Candidate', description: 'Are you sure you want to delete this candidate?', variant: 'destructive' })) return;
        try {
            await api.delete(`${endpoint}/${id}`);
            setCandidates(prev => prev.filter(c => c.id !== id));
            setTotal(prev => Math.max(0, prev - 1));
            cache.current = {}; // Invalidate cache
        } catch (error) {
            console.error('Failed to delete:', error);
            toast.error('Failed to delete candidate');
        }
    }, [endpoint]);

    const handleDeleteMany = useCallback(async (ids) => {
        if (!await confirm({ title: 'Delete Candidates', description: `Are you sure you want to delete ${ids.length} candidates?`, variant: 'destructive' })) return;
        // Optimistic UI update or wait? Wait is safer.
        try {
            await Promise.all(ids.map(id => api.delete(`${endpoint}/${id}`)));
            setCandidates(prev => prev.filter(c => !ids.includes(c.id)));
            setTotal(prev => Math.max(0, prev - ids.length));
            cache.current = {}; // Invalidate cache
        } catch (error) {
            console.error('Failed to delete some candidates:', error);
            toast.error('Failed to delete some candidates');
            cache.current = {}; // Invalidate cache just in case
            loadCandidates(); // Refresh to ensure sync
        }
    }, [endpoint, loadCandidates]);

    const handleSave = useCallback(async () => {
        if (!formData.first_name || !formData.last_name || !formData.email) {
            toast.error('First Name, Last Name, and Email are required.');
            return;
        }

        // console.log("Saving Candidate Data:", formData); // DEBUG
        setSaving(true);
        try {
            if (editingId) {
                // Update
                const res = await api.put(`${endpoint}/${editingId}`, formData);
                // console.log("Update Response:", res.data); // DEBUG
                setCandidates(prev => prev.map(c => c.id === editingId ? res.data.candidate : c));
            } else {
                // Create
                const res = await api.post(endpoint, formData);
                setCandidates(prev => [...prev, res.data.candidate]);
                setTotal(prev => prev + 1);
            }
            cache.current = {}; // Invalidate cache on any change
            toast.success(editingId ? 'Candidate updated' : 'Candidate created');
            setShowModal(false);
        } catch (error) {
            console.error('Failed to save:', error);
            toast.error(error.response?.data?.error || 'Failed to save candidate');
        } finally {
            setSaving(false);
        }
    }, [formData, endpoint, editingId]);

    return (
        <div className="max-w-[1600px] mx-auto p-8">
            <ConfirmDialog />
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Candidates</h1>
                    <p className="text-gray-500">Manage your candidate database</p>
                </div>

                {/* Country Toggle Tabs */}
                <div className="bg-gray-100 p-1 rounded-lg flex space-x-1 overflow-x-auto max-w-[800px]">
                    <button
                        onClick={() => { setCountryFilter('All'); setPage(1); }}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${countryFilter === 'All'
                            ? 'bg-white text-black shadow-sm'
                            : 'text-gray-500 hover:text-gray-900'
                            }`}
                    >
                        All Candidates
                    </button>
                    {availableCountries.map(country => (
                        <button
                            key={country}
                            onClick={() => { setCountryFilter(country); setPage(1); }}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${countryFilter === country
                                ? 'bg-white text-black shadow-sm'
                                : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            {country} Candidates
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => {
                        setEditingId(null); // Corrected from setEditingCandidate(null)
                        setFormData(initialFormState);
                        setShowModal(true);
                    }}
                    className="bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-800 transition-colors"
                >
                    <Plus size={20} />
                    Add Candidate
                </button>
            </div>

            {/* Global Search (Optional, effectively pre-filters the data for the table) */}
            {/* Note: The new table has its own filter, but it only filters loaded data. 
                Keeping this search is useful for server-side filtering if DB is large. 
                However, for consistency visually, maybe I should rely on the table if data is small?
                Assuming data is loaded all at once (based on loadCandidates implementation), the table handles it. 
                But current loadCandidates uses ?search=... so it's server side.
                I will keep this search bar but maybe style it to match or let it sit above.
            */}

            <div className="bg-white rounded-lg border shadow-sm p-1">
                <div className="p-4">
                    <CandidateTable
                        data={candidates}
                        type={type}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onDeleteCount={handleDeleteMany}
                        disablePagination={true}
                        searchQuery={search}
                        onSearch={setSearch}
                        isLoading={loading}
                        onPrefetch={prefetchPage}
                    />
                </div>
            </div>

            {/* Pagination Controls */}
            <div className="flex justify-between items-center mt-4 p-2 bg-white rounded-lg border shadow-sm">
                <div className="text-sm text-gray-500">
                    Showing {candidates.length > 0 ? (page - 1) * limit + 1 : 0} to {Math.min(page * limit, total)} of {total} candidates
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 text-sm font-medium"
                    >
                        Previous
                    </button>
                    <span className="text-sm">Page {page} of {Math.ceil(total / limit) || 1}</span>
                    <button
                        onClick={() => setPage(p => p + 1)}
                        disabled={page * limit >= total}
                        className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 text-sm font-medium"
                    >
                        Next
                    </button>

                    <div className="ml-4">
                        <Select
                            value={String(limit)}
                            onValueChange={(value) => {
                                setLimit(Number(value));
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-[120px] h-8">
                                <SelectValue placeholder="Limit" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10 / page</SelectItem>
                                <SelectItem value="20">20 / page</SelectItem>
                                <SelectItem value="50">50 / page</SelectItem>
                                <SelectItem value="100">100 / page</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editingId ? 'Edit Candidate' : 'Add New Candidate'}
                footer={
                    <div className="flex gap-3 w-full">
                        <button
                            onClick={() => setShowModal(false)}
                            className="px-6 border border-gray-300 font-medium hover:bg-gray-100 rounded-md transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 bg-black text-white py-2.5 font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors disabled:opacity-50 rounded-md"
                        >
                            {saving && <Loader size="small" />}
                            {editingId ? 'Save Changes' : 'Create Candidate'}
                        </button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-gray-500">Recruitment Country</label>
                        <Select
                            value={formData.country || availableCountries[0]}
                            onValueChange={(value) => setFormData({ ...formData, country: value })}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Country" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableCountries.map(c => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase text-gray-500">First Name <span className="text-red-500">*</span></label>
                            <input
                                className="w-full border p-2 text-sm focus:border-black outline-none rounded-md focus:ring-1 focus:ring-black"
                                value={formData.first_name}
                                onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase text-gray-500">Last Name <span className="text-red-500">*</span></label>
                            <input
                                className="w-full border p-2 text-sm focus:border-black outline-none rounded-md focus:ring-1 focus:ring-black"
                                value={formData.last_name}
                                onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-gray-500">Email <span className="text-red-500">*</span></label>
                        <input
                            className="w-full border p-2 text-sm focus:border-black outline-none rounded-md focus:ring-1 focus:ring-black"
                            type="email"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-gray-500">Phone</label>
                        <input
                            className="w-full border p-2 text-sm focus:border-black outline-none rounded-md focus:ring-1 focus:ring-black"
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        />
                    </div>

                    {/* Always show address/citizenship fields now, as they are applicable to all */}
                    <>
                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase text-gray-500">Address</label>
                            <input
                                className="w-full border p-2 text-sm focus:border-black outline-none rounded-md focus:ring-1 focus:ring-black"
                                value={formData.address}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase text-gray-500">Citizenship</label>
                            <input
                                className="w-full border p-2 text-sm focus:border-black outline-none rounded-md focus:ring-1 focus:ring-black"
                                value={formData.citizenship}
                                onChange={e => setFormData({ ...formData, citizenship: e.target.value })}
                            />
                        </div>
                    </>
                </div>
            </Modal>
        </div>
    );
};

export default CandidateManager;
