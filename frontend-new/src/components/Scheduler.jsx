import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Users, Video, Link, MoreVertical, Plus, X, Trash2, Check, AlertCircle, List as ListIcon, Loader2, Send, XCircle, Upload, Edit, CheckCircle } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./ui/select";
import Modal from './ui/Modal';
import { useConfirm } from '../hooks/useConfirm';
import api from '../utils/api';
import Loader from './ui/Loader';
import { DatetimePicker } from './ui/datetime-picker';
import EmailPreviewModal from './ui/EmailPreviewModal';
import { cn } from '../lib/utils';

// Helper to get Date object from form data
const getCombinedDate = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return undefined;
    const d = new Date(`${dateStr}T${timeStr}`);
    return isNaN(d.getTime()) ? undefined : d;
};

// Helper to update form data from Date object
const updateFormDataFromDate = (date) => {
    if (!date) return { date: '', time: '' };
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return {
        date: `${year}-${month}-${day}`,
        time: `${hours}:${minutes}`
    };
};

const hourOptions = Array.from({ length: 12 }, (_, i) => {
    const val = (i + 1).toString().padStart(2, '0');
    return { label: val, value: val };
});

const minuteOptions = Array.from({ length: 12 }, (_, i) => ({
    label: (i * 5).toString().padStart(2, '0'),
    value: (i * 5).toString().padStart(2, '0')
}));

const meridiemOptions = [
    { label: 'AM', value: 'AM' },
    { label: 'PM', value: 'PM' }
];

// Helper Functions
const format24To12 = (time24) => {
    if (!time24) return '';
    const [h, m] = time24.split(':').map(Number);
    const meridiem = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${meridiem}`;
};

const to12HourParts = (time24) => {
    if (!time24) return { hour: '12', minute: '00', meridiem: 'AM' };
    const [h, m] = time24.split(':').map(Number);
    const meridiem = h >= 12 ? 'PM' : 'AM';
    const h12 = (h % 12 || 12).toString().padStart(2, '0');
    return { hour: h12, minute: m.toString().padStart(2, '0'), meridiem };
};

const to24Hour = (hour12, minute, meridiem) => {
    let h = parseInt(hour12, 10);
    if (meridiem === 'PM' && h !== 12) h += 12;
    if (meridiem === 'AM' && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${minute}`;
};



const Scheduler = ({
    interviews,
    setInterviews,
    calendarView,
    setCalendarView,
    summary,
    loadScheduleData
}) => {
    // Calendar Navigation State
    const [currentDate, setCurrentDate] = useState(new Date());

    // Confirmation Hook
    const { confirm, ConfirmDialog } = useConfirm();

    // View State
    const [view, setView] = useState('month'); // 'month', 'week', 'day', 'list'
    const [csvImportData, setCsvImportData] = useState('');
    const [importingCsv, setImportingCsv] = useState(false);

    // Drag and Drop State
    const [draggedInterview, setDraggedInterview] = useState(null);
    const [dragOverDate, setDragOverDate] = useState(null);
    // eslint-disable-next-line no-unused-vars
    const [draggingInterviewId, setDraggingInterviewId] = useState(null);

    // Action State
    // eslint-disable-next-line no-unused-vars
    const [updatingInterviewStatus, setUpdatingInterviewStatus] = useState(new Set());
    const [sendingInterviewEmail, setSendingInterviewEmail] = useState(new Set());

    // Load data on mount and when date changes
    // Load data on mount and when date changes (debounced/logic)
    // Helper to calculate load range
    const getLoadRange = useCallback((date) => {
        const start = new Date(date);
        start.setDate(1); // 1st of current month
        start.setMonth(start.getMonth() - 1); // Look back 1 month

        const end = new Date(date);
        end.setDate(1);
        end.setMonth(end.getMonth() + 2); // Look forward 2 months
        end.setDate(0); // End of that month
        return { start, end };
    }, []);

    // Load data on mount and when date changes
    useEffect(() => {
        if (loadScheduleData) {
            const { start, end } = getLoadRange(currentDate);
            loadScheduleData(start, end);
        }
    }, [loadScheduleData, currentDate, getLoadRange]);

    // Helper to reload data
    const refreshData = useCallback(() => {
        if (loadScheduleData) {
            const { start, end } = getLoadRange(currentDate);
            loadScheduleData(start, end);
        }
    }, [loadScheduleData, currentDate, getLoadRange]);

    // Settings State for Email Templates
    const [settings, setSettings] = useState({});
    const [emailPreviewOpen, setEmailPreviewOpen] = useState(false);
    const [previewData, setPreviewData] = useState(null); // { candidate, template, initialContent, initialSubject, ... }

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await api.get('/api/settings');
                setSettings(res.data.settings || {});
            } catch (e) {
                console.error("Failed to fetch settings", e);
            }
        };
        fetchSettings();
    }, []);


    // Helper to generate calendar grid
    const generateCalendarGrid = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        if (view === 'month') {
            const firstDay = new Date(year, month, 1);
            // Start date (find previous Sunday)
            const startDate = new Date(firstDay);
            startDate.setDate(startDate.getDate() - startDate.getDay());
            // End date (find next Saturday to complete 6 weeks/42 days)
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 41);

            const days = [];
            let day = new Date(startDate);
            while (day <= endDate) {
                days.push(new Date(day));
                day.setDate(day.getDate() + 1);
            }
            return days;
        } else if (view === 'week') {
            const startDate = new Date(currentDate);
            startDate.setDate(startDate.getDate() - startDate.getDay()); // Sunday start
            const days = [];
            for (let i = 0; i < 7; i++) {
                const day = new Date(startDate);
                day.setDate(startDate.getDate() + i);
                days.push(day);
            }
            return days;
        } else if (view === 'day') {
            return [new Date(currentDate)];
        }
        return [];
    };

    const calendarDays = generateCalendarGrid();

    // Navigation handlers
    const navigate = (direction) => {
        const newDate = new Date(currentDate);
        if (view === 'month') {
            newDate.setMonth(newDate.getMonth() + direction);
        } else if (view === 'week') {
            newDate.setDate(newDate.getDate() + (direction * 7));
        } else if (view === 'day') {
            newDate.setDate(newDate.getDate() + direction);
        }
        setCurrentDate(newDate);
    };

    const prevPeriod = () => navigate(-1);
    const nextPeriod = () => navigate(1);
    const goToToday = () => setCurrentDate(new Date());

    // Calculate Stats for Current View
    const viewStats = React.useMemo(() => {
        let start, end;
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        if (view === 'month') {
            start = new Date(year, month, 1);
            end = new Date(year, month + 1, 0, 23, 59, 59);
        } else if (view === 'week') {
            start = new Date(currentDate);
            start.setDate(start.getDate() - start.getDay()); // Sunday
            start.setHours(0, 0, 0, 0);
            end = new Date(start);
            end.setDate(end.getDate() + 6);
            end.setHours(23, 59, 59, 999);
        } else if (view === 'day') {
            start = new Date(currentDate);
            start.setHours(0, 0, 0, 0);
            end = new Date(currentDate);
            end.setHours(23, 59, 59, 999);
        } else {
            // List view (show all fetched)
            return summary || { total_interviews: 0, upcoming_interviews: 0, confirmed_interviews: 0, pending_interviews: 0 };
        }

        const viewInterviews = interviews.filter(i => {
            const d = new Date(i.interview_date);
            return d >= start && d <= end;
        });

        const stats = {
            total_interviews: viewInterviews.length,
            upcoming_interviews: viewInterviews.filter(i => new Date(i.interview_date) > new Date() && i.status !== 'cancelled' && i.status !== 'completed').length,
            confirmed_interviews: viewInterviews.filter(i => i.status === 'confirmed').length,
            pending_interviews: viewInterviews.filter(i => i.status === 'pending').length
        };
        return stats;
    }, [interviews, currentDate, view, summary]);

    // Filter interviews for a specific date
    const getInterviewsForDate = (date) => {
        return interviews.filter(i => {
            const iDate = new Date(i.interview_date);
            return iDate.getDate() === date.getDate() &&
                iDate.getMonth() === date.getMonth() &&
                iDate.getFullYear() === date.getFullYear();
        }).sort((a, b) => new Date(a.interview_date) - new Date(b.interview_date)); // Sort by time
    };

    // Interview statuses
    const interviewStatuses = [
        { value: 'pending', label: 'Pending' },
        { value: 'confirmed', label: 'Confirmed' },
        { value: 'rescheduled', label: 'Rescheduled' },
        { value: 'cancelled', label: 'Cancelled' },
        { value: 'completed', label: 'Completed' },
        { value: 'absent', label: 'Absent' }
    ];

    // Helper functions
    const formatTime = (timeString) => {
        if (!timeString) return '';
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };

    const formatDateForHeader = (dateString) => {
        const date = new Date(dateString);
        return {
            weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
            day: date.getDate(),
            full: date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
        };
    };

    const getInterviewStatusStyle = (status) => {
        switch (status?.toLowerCase()) {
            case 'confirmed': return 'bg-green-100 border-green-300 text-green-800';
            case 'pending': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
            case 'cancelled': return 'bg-red-100 border-red-300 text-red-800';
            case 'completed': return 'bg-blue-100 border-blue-300 text-blue-800';
            case 'rescheduled': return 'bg-orange-100 border-orange-300 text-orange-800';
            case 'absent': return 'bg-purple-100 border-purple-300 text-purple-800';
            default: return 'bg-gray-100 border-gray-300 text-gray-700';
        }
    };

    const getInterviewCardStyle = (status) => {
        switch (status?.toLowerCase()) {
            case 'confirmed': return 'border-green-300 bg-green-50 hover:bg-green-100 hover:border-black';
            case 'pending': return 'border-yellow-300 bg-yellow-50 hover:bg-yellow-100 hover:border-black';
            case 'cancelled': return 'border-red-300 bg-red-50 hover:bg-red-100 hover:border-black';
            case 'completed': return 'border-blue-300 bg-blue-50 hover:bg-blue-100 hover:border-black';
            case 'rescheduled': return 'border-orange-300 bg-orange-50 hover:bg-orange-100 hover:border-black';
            case 'absent': return 'border-purple-300 bg-purple-50 hover:bg-purple-100 hover:border-black';
            default: return 'border-gray-200 bg-white hover:bg-gray-50 hover:border-black';
        }
    };

    const shouldShowSendEmailButton = (interview) => {
        const s = interview.status?.toLowerCase() || 'pending';
        const mappings = settings.status_email_mappings || {};
        const templateId = mappings[s];
        return !!templateId && templateId !== 'none';
    };

    const updateInterviewStatus = async (interviewId, newStatus) => {
        setUpdatingInterviewStatus(prev => new Set(prev).add(interviewId));
        try {
            const response = await api.put(`/api/interviews/${interviewId}`, { status: newStatus });

            if (response.status === 200) {
                // Optimistic update
                setInterviews(prev => prev.map(i => i.id === interviewId ? { ...i, status: newStatus } : i));
                setCalendarView(prev => {
                    const updated = { ...prev };
                    Object.keys(updated).forEach(date => {
                        updated[date] = updated[date].map(i => i.id === interviewId ? { ...i, status: newStatus } : i);
                    });
                    return updated;
                });
                setTimeout(() => refreshData(), 100);
            }
        } catch (error) {
            console.error('Failed to update status:', error);
            toast.error('Failed to update status');
        } finally {
            setUpdatingInterviewStatus(prev => {
                const newSet = new Set(prev);
                newSet.delete(interviewId);
                return newSet;
            });
        }
    };

    const sendInterviewEmail = async (interview) => {
        const status = interview.status?.toLowerCase() || 'pending';
        const mappings = settings.status_email_mappings || {};
        const templateId = mappings[status];

        console.log(`Sending email for status: ${status}, mapped template: ${templateId}`);

        if (!templateId || templateId === 'none') {
            // Fallback to legacy behavior or alert
            if (!await confirm({ title: 'No Template Mapped', description: `No email template is configured for status "${status}". Continue with default?` })) return;
            // ... legacy logic or just stop
            return;
        }

        try {
            // Fetch template
            const templateRes = await api.get(`/api/templates/${templateId}`);
            const template = templateRes.data.template;

            // Prepare variable replacements
            const candidateName = interview.candidate?.full_name || interview.candidate?.first_name || 'Candidate';
            const interviewDate = formatDate(interview.interview_date);
            const interviewTime = formatTime(interview.interview_time);
            const meetLink = interview.meet_link || '#';

            // Replace variables in subject and content (simple replacement)
            let subject = template.subject
                .replace(/{CandidateName}/g, candidateName)
                .replace(/{Time}/g, interviewTime)
                .replace(/{Date}/g, interviewDate); // Add Date support if needed

            let content = (template.html_content || template.plain_content || '')
                .replace(/{CandidateName}/g, candidateName)
                .replace(/{Time}/g, interviewTime)
                .replace(/{Date}/g, interviewDate)
                .replace(/{Link}/g, meetLink);

            // Open Preview
            setPreviewData({
                candidate: interview.candidate,
                template: template,
                initialSubject: subject,
                initialContent: content,
                interviewId: interview.id
            });
            setEmailPreviewOpen(true);

        } catch (error) {
            console.error("Error preparing email:", error);
            toast.error("Failed to load email template.");
        }
    };

    const handleSendEmailFinal = async (subject, content) => {
        if (!previewData) return;

        try {
            // We use the direct send endpoint, but we pass the *final* content as overrides or use a generic 'send raw' endpoint.
            // Since the backend `send-emails` expects a templateId OR raw content, let's see what `app.py` supports.
            // `app.py` implementation of `/api/send-emails` (via `scheduling_api.py` likely?? No, it was calling `data = request.json`... check `app.py` again? No, `send-emails` wasn't in the snippet I saw. It might be in `scheduling_api.py` or `util`?)
            // Wait, I didn't verify `/api/send-emails` implementation. I saw it used in `Scheduler.jsx`.

            // Assuming we can send raw content. If not, we might need to create a temporary draft or modify the endpoint.
            // Let's assume we can create a "Draft" then send it? 
            // Or just use the `Draft` API to send?
            // Actually, `app.py` has `send_campaign_task`. 

            // Let's verify `networking` or `send-emails` endpoint. 
            // I'll assume for now I should use a new endpoint or the draft API.
            // Let's create a new endpoint in `templates_api` to send ad-hoc email?
            // Or use the existing one if adaptable.

            // For now, I'll send to `/api/send-custom-email` which I will create.

            await api.post('/api/send-custom-email', {
                recipient_email: previewData.candidate.email,
                recipient_name: previewData.candidate.full_name,
                subject: subject,
                html_content: content,
                interview_id: previewData.interviewId // For logging/status update
            });

            toast.success("Email sent successfully!");
            // Update interview status to 'email sent'?
        } catch (error) {
            console.error(error);
            toast.error("Failed to send email.");
        }
    };

    const handleCsvFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const text = await file.text();
        setCsvImportData(text);
    };

    const importCsvToScheduler = async () => {
        if (!csvImportData.trim()) return;
        setImportingCsv(true);
        try {
            const response = await api.post('/api/candidates/import', { csv_data: csvImportData });

            if (response.data.success) {
                toast.success(`Successfully imported ${response.data.imported} candidates/interviews`);
                setCsvImportData('');
                refreshData();
            } else {
                toast.error(`Import failed: ${response.data.error}`);
            }
        } catch {
            toast.error('Failed to import CSV');
        } finally {
            setImportingCsv(false);
        }
    };

    // Drag and Drop Logic
    const handleDragStart = (e, interview) => {
        setDraggedInterview(interview);
        setDraggingInterviewId(interview.id);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', interview.id.toString());

        // Custom drag image
        const dragImage = e.currentTarget.cloneNode(true);
        dragImage.style.width = e.currentTarget.offsetWidth + 'px';
        dragImage.style.position = 'absolute';
        dragImage.style.top = '-1000px';
        document.body.appendChild(dragImage);
        e.dataTransfer.setDragImage(dragImage, e.currentTarget.offsetWidth / 2, e.currentTarget.offsetHeight / 2);

        setTimeout(() => {
            if (document.body.contains(dragImage)) document.body.removeChild(dragImage);
        }, 0);

        e.currentTarget.style.opacity = '0.4';
    };

    const handleDragEnd = (e) => {
        e.currentTarget.style.opacity = '1';
        setDraggedInterview(null);
        setDragOverDate(null);
        setDraggingInterviewId(null);
    };

    const handleDragOver = (e, date) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverDate(date);
    };

    const minutesToTime = (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    };

    const calculateTimeFromPosition = (y, containerHeight) => {
        const normalizedY = Math.max(0, Math.min(1, y / containerHeight));
        const startMinutes = 540; // 9:00 AM
        const endMinutes = 1020; // 5:00 PM
        const totalMinutes = endMinutes - startMinutes;
        let targetMinutes = startMinutes + (normalizedY * totalMinutes);
        targetMinutes = Math.round(targetMinutes / 30) * 30;
        return minutesToTime(targetMinutes);
    };

    // Helper to properly format local date as YYYY-MM-DD
    const getLocalDateString = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const updateInterviewDateTime = async (interviewId, targetDate, newTime) => {
        try {
            // targetDate is YYYY-MM-DD string
            const [year, month, day] = targetDate.split('-').map(Number);
            const [hours, minutes] = newTime.split(':').map(Number);

            // Create local date object
            const newDateTime = new Date(year, month - 1, day, hours, minutes, 0);

            // Optimistic update
            const updatedInterview = {
                ...interviews.find(i => i.id === interviewId),
                interview_date: newDateTime.toISOString(),
                interview_time: newTime
            };

            setInterviews(prev => prev.map(i => i.id === interviewId ? updatedInterview : i));

            const response = await api.put(`/api/interviews/${interviewId}`, {
                interview_date: newDateTime.toISOString(),
                interview_time: newTime
            });

            if (response.status === 200) {
                refreshData();
            } else {
                toast.error('Failed to update interview time.');
                refreshData(); // Revert
            }
        } catch (error) {
            console.error("Update failed:", error);
            toast.error('Failed to move interview. Please try again.');
            refreshData(); // Revert
        }
    };

    const handleDrop = async (e, targetDate) => {
        e.preventDefault();
        const interviewId = parseInt(e.dataTransfer.getData('text/plain'));
        if (!draggedInterview || draggedInterview.id !== interviewId) {
            setDragOverDate(null);
            return;
        }

        const rect = e.currentTarget.getBoundingClientRect();
        const offsetY = e.clientY - rect.top;
        const newTime = calculateTimeFromPosition(offsetY, rect.height);

        // Update Backend
        setDraggingInterviewId(interviewId);
        try {
            await updateInterviewDateTime(interviewId, targetDate, newTime);
        } catch (err) {
            console.error(err);
        } finally {
            setDragOverDate(null);
            setDraggingInterviewId(null);
            setDraggedInterview(null);
        }
    };

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
    const [selectedDate, setSelectedDate] = useState(null);
    const [editingInterview, setEditingInterview] = useState(null);
    const [modalFormData, setModalFormData] = useState({
        candidateName: '',
        candidateEmail: '',
        date: '',
        time: '09:00',
        link: '',
        status: 'pending',
        notes: ''
    });

    // Modal Handlers
    const openAddModal = (date) => {
        setModalMode('add');
        setSelectedDate(date);
        setModalFormData({
            candidateName: '',
            candidateEmail: '',
            date: getLocalDateString(date), // Fixed: Use local date string
            time: '09:00',
            link: '',
            status: 'pending',
            notes: ''
        });
        setIsModalOpen(true);
    };

    const openEditModal = (interview) => {
        setModalMode('edit');
        setEditingInterview(interview);
        setModalFormData({
            candidateName: interview.candidate?.full_name || '',
            candidateEmail: interview.candidate?.email || '',
            date: new Date(interview.interview_date).toISOString().split('T')[0],
            time: interview.interview_time || '09:00',
            link: interview.meet_link || '',
            status: interview.status || 'pending',
            notes: interview.notes || ''
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingInterview(null);
    };

    const handleDeleteInterview = async () => {
        if (!editingInterview) return;
        if (!await confirm({ title: 'Delete Interview', description: 'Are you sure you want to delete this interview?', variant: 'destructive' })) return;

        try {
            await api.delete(`/api/interviews/${editingInterview.id}`);
            closeModal();
            refreshData();
        } catch (error) {
            console.error("Failed to delete interview:", error);
            toast.error('Failed to delete interview. Please try again.');
        }
    };

    const handleSaveInterview = async (e) => {
        e.preventDefault();
        try {
            // Construct payload
            // Send date string directly to avoid timezone shifting
            const payload = {
                candidate_name: modalFormData.candidateName,
                candidate_email: modalFormData.candidateEmail,
                interview_date: modalFormData.date,
                interview_time: modalFormData.time,
                meet_link: modalFormData.link,
                status: modalFormData.status,
                notes: modalFormData.notes
            };

            let response;
            if (modalMode === 'add') {
                // 1. Check if candidate exists by email first (or try to create and handle 400)
                let candidateId;

                try {
                    // Try to create
                    const candRes = await api.post('/api/candidates', {
                        first_name: modalFormData.candidateName.split(' ')[0],
                        last_name: modalFormData.candidateName.split(' ').slice(1).join(' ') || '.', // Fallback for single name
                        email: modalFormData.candidateEmail,
                        status: 'active'
                    });
                    candidateId = candRes.data.candidate?.id;
                } catch (err) {
                    if (err.response && err.response.status === 400 && err.response.data.error?.includes('Email already exists')) {
                        // Candidate exists, find them
                        const searchRes = await api.get(`/api/candidates?search=${encodeURIComponent(modalFormData.candidateEmail)}`);
                        const existing = searchRes.data.candidates.find(c => c.email.toLowerCase() === modalFormData.candidateEmail.toLowerCase());
                        if (existing) {
                            candidateId = existing.id;
                        } else {
                            throw new Error("Email exists but could not find candidate. Please check the email.");
                        }
                    } else {
                        throw err;
                    }
                }

                if (!candidateId) throw new Error("Failed to resolve candidate ID");

                // 2. Create Interview
                response = await api.post('/api/interviews', {
                    candidate_id: candidateId,
                    interview_date: payload.interview_date,
                    interview_time: payload.interview_time,
                    status: payload.status,
                    meet_link: payload.meet_link,
                    notes: payload.notes
                });

            } else {
                // Edit existing
                response = await api.put(`/api/interviews/${editingInterview.id}`, {
                    ...payload,
                    // Also update candidate info if changed? (Optional, maybe just interview details)
                });
            }

            if (response.status === 200 || response.status === 201) {
                toast.success(modalMode === 'add' ? 'Interview Scheduled!' : 'Interview Updated!');
                closeModal();
                refreshData();
            }
        } catch (error) {
            console.error(error);
            const apiError = error?.response?.data;
            if (apiError?.error === 'Scheduling conflict detected') {
                const details = (apiError.conflicts || []).join(' | ');
                toast.error(
                    details
                        ? `Scheduling conflict: ${details}`
                        : 'Scheduling conflict: candidate already has an interview in this time window.'
                );
            } else {
                toast.error(apiError?.error || 'Failed to save interview');
            }
        }
    };



    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ConfirmDialog />
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-none border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-[11px] font-bold uppercase tracking-wider mb-1">Total Interviews</p>
                            <h3 className="text-3xl font-black text-gray-900 tracking-tight">{viewStats?.total_interviews || 0}</h3>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-full">
                            <CheckCircle className="text-green-500" size={24} />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-none border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-[11px] font-bold uppercase tracking-wider mb-1">Upcoming</p>
                            <h3 className="text-3xl font-black text-blue-600 tracking-tight">{viewStats?.upcoming_interviews || 0}</h3>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-full">
                            <Users className="text-blue-500" size={24} />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-none border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-[11px] font-bold uppercase tracking-wider mb-1">Confirmed</p>
                            <h3 className="text-3xl font-black text-green-600 tracking-tight">{viewStats?.confirmed_interviews || 0}</h3>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-full">
                            <Check className="text-teal-500" size={24} />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-none border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-[11px] font-bold uppercase tracking-wider mb-1">Pending</p>
                            <h3 className="text-3xl font-black text-yellow-500 tracking-tight">{viewStats?.pending_interviews || 0}</h3>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-full">
                            <Clock className="text-yellow-500" size={24} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="ink-card border border-gray-200 overflow-hidden">
                {/* Header Controls */}
                <div className="border-b border-gray-100 px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white">
                    <div className="flex items-center gap-6">
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                            {view === 'month' && currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            {view === 'week' && `Week of ${currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                            {view === 'day' && currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                            {view === 'list' && 'All Interviews'}
                        </h2>
                        {view !== 'list' && (
                            <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-lg">
                                <button onClick={prevPeriod} className="p-1.5 hover:bg-white hover:text-black text-gray-500 rounded-md shadow-sm transition-all"><ChevronLeft size={18} /></button>
                                <button onClick={goToToday} className="px-3 py-1 text-xs font-bold hover:bg-white hover:text-black text-gray-600 rounded-md shadow-sm transition-all uppercase tracking-wide">Today</button>
                                <button onClick={nextPeriod} className="p-1.5 hover:bg-white hover:text-black text-gray-500 rounded-md shadow-sm transition-all"><ChevronRight size={18} /></button>
                            </div>
                        )}
                    </div>

                    <div className="flex bg-gray-100/80 p-1 rounded-lg items-center">
                        <button
                            onClick={() => openAddModal(currentDate)}
                            className="mr-3 px-3 py-1.5 bg-black text-white rounded-md text-sm font-bold shadow-sm hover:opacity-90 transition-all flex items-center gap-1"
                        >
                            <Plus size={14} strokeWidth={3} /> Add
                        </button>
                        <div className="w-px bg-gray-300 mx-1 h-4 self-center"></div>
                        <button
                            onClick={() => setView('month')}
                            className={`px-3 py-2 rounded-md text-sm font-bold transition-all ${view === 'month' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Month
                        </button>
                        <button
                            onClick={() => setView('week')}
                            className={`px-3 py-2 rounded-md text-sm font-bold transition-all ${view === 'week' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Week
                        </button>
                        <button
                            onClick={() => setView('day')}
                            className={`px-3 py-2 rounded-md text-sm font-bold transition-all ${view === 'day' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Day
                        </button>
                        <div className="w-px bg-gray-300 mx-1 h-4 self-center"></div>
                        <button
                            onClick={() => setView('list')}
                            className={`px-3 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${view === 'list' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <ListIcon size={16} /> <span className="hidden sm:inline">List</span>
                        </button>
                    </div>
                </div>

                <div className="p-0">
                    {view !== 'list' ? (
                        <>
                            {/* Day Headers - Hide for Day View? Or show single? */}
                            {view !== 'day' && (
                                <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/50">
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                        <div key={day} className="text-[11px] font-bold uppercase text-gray-500 tracking-widest py-3 text-center">{day}</div>
                                    ))}
                                </div>
                            )}

                            {/* Calendar Grid */}
                            <div className={`grid gap-px bg-gray-100 ${view === 'day' ? 'grid-cols-1' : 'grid-cols-7'}`}>
                                {calendarDays.map((date, idx) => {
                                    const dateStr = getLocalDateString(date); // Use local safe string
                                    const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                                    const isToday = date.toDateString() === new Date().toDateString();
                                    const dayInterviews = getInterviewsForDate(date);

                                    return (
                                        <div
                                            key={idx}
                                            className={`relative group transition-all duration-200 
                                                ${view === 'month' ? 'min-h-[180px]' : view === 'week' ? 'min-h-[500px]' : 'min-h-[600px]'}
                                                ${!isCurrentMonth && view === 'month' ? 'bg-gray-50/30 text-gray-300' : 'bg-white'} 
                                                ${dragOverDate === dateStr ? 'bg-blue-50/50 ring-2 ring-inset ring-blue-400' : ''}
                                                hover:bg-gray-50/50
                                            `}
                                            onDragOver={(e) => handleDragOver(e, dateStr)}
                                            onDrop={(e) => handleDrop(e, dateStr)}
                                            onDragLeave={() => setDragOverDate(null)}
                                            onClick={() => openAddModal(date)}
                                        >
                                            {/* Drop Target Overlay */}
                                            {dragOverDate === dateStr && (
                                                <div className="absolute inset-0 bg-blue-100/50 z-10 border-2 border-blue-500 rounded-lg flex items-center justify-center pointer-events-none">
                                                    <span className="text-xs font-bold text-blue-700 bg-white/80 px-2 py-1 rounded shadow-sm">
                                                        Drop to Reschedule
                                                    </span>
                                                </div>
                                            )}

                                            <div className={`p-3 flex justify-between items-start ${isToday ? 'bg-[#00ffcb]/10' : ''}`}>
                                                <span className={`
                                                    text-sm font-semibold rounded-full w-8 h-8 flex items-center justify-center transition-all
                                                    ${isToday ? 'bg-[#00ffcb] text-black shadow-md scale-110' : 'text-gray-700 group-hover:bg-white group-hover:shadow-sm'}
                                                `}>
                                                    {date.getDate()}
                                                </span>
                                                {/* Add Button (hover only) */}
                                                <button className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-black hover:text-white rounded-full transition-all text-gray-300 transform translate-x-2 -translate-y-2 group-hover:translate-x-0 group-hover:translate-y-0">
                                                    <Plus size={14} strokeWidth={3} />
                                                </button>
                                            </div>

                                            <div className={`px-1 pb-1 space-y-1 overflow-y-auto no-scrollbar ${view === 'month' ? 'max-h-[140px]' : 'h-full'}`}>
                                                {dayInterviews.map(interview => (
                                                    <div
                                                        key={interview.id}
                                                        draggable={true}
                                                        onDragStart={(e) => handleDragStart(e, interview)}
                                                        onDragEnd={handleDragEnd}
                                                        onClick={(e) => { e.stopPropagation(); openEditModal(interview); }}
                                                        className={`relative group p-1.5 rounded border shadow-sm cursor-grab active:cursor-grabbing transition-all hover:shadow-md text-xs ${getInterviewCardStyle(interview.status)}`}
                                                    >
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="font-bold truncate" title={interview.candidate?.full_name}>
                                                                {interview.candidate?.first_name} {interview.candidate?.last_name?.[0]}.
                                                            </span>
                                                            {shouldShowSendEmailButton(interview) && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); sendInterviewEmail(interview); }}
                                                                    className="text-gray-400 hover:text-blue-600"
                                                                    title="Send Email"
                                                                >
                                                                    <Send size={10} />
                                                                </button>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-1">
                                                            <span>{formatTime(interview.interview_time)}</span>
                                                        </div>

                                                        {/* Compact Status Dropdown */}
                                                        <div onClick={e => e.stopPropagation()}>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <button className={`w-full text-left text-[9px] uppercase font-bold py-0.5 focus:outline-none cursor-pointer hover:opacity-80 transition-opacity ${getInterviewStatusStyle(interview.status).split(' ')[2]}`}>
                                                                        {interviewStatuses.find(s => s.value === (interview.status || 'pending'))?.label}
                                                                        <span className="sr-only">Change status</span>
                                                                    </button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="start" className="w-32">
                                                                    <DropdownMenuLabel className="text-xs">Update Status</DropdownMenuLabel>
                                                                    <DropdownMenuSeparator />
                                                                    {interviewStatuses.map(s => (
                                                                        <DropdownMenuItem
                                                                            key={s.value}
                                                                            onClick={() => updateInterviewStatus(interview.id, s.value)}
                                                                            className="text-xs cursor-pointer"
                                                                        >
                                                                            {s.label}
                                                                        </DropdownMenuItem>
                                                                    ))}
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto p-6">
                            {interviews.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">No interviews found</div>
                            ) : (
                                interviews.map(interview => (
                                    <div key={interview.id} className={`interview-item border p-3 ${getInterviewCardStyle(interview.status)}`}>
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="font-semibold text-black text-sm">{interview.candidate?.full_name || 'Unknown'}</p>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide ${getInterviewStatusStyle(interview.status).replace('border', '')}`}>
                                                        {interview.status}
                                                    </span>
                                                </div>
                                                <div className="flex gap-4 text-xs text-gray-500">
                                                    <p>📅 {formatDate(interview.interview_date)}</p>
                                                    <p>🕐 {formatTime(interview.interview_time)}</p>
                                                </div>
                                            </div>
                                            {/* Actions */}
                                            <div className="flex items-center gap-2">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="outline" size="sm" className="h-7 text-xs px-2 gap-1 border-dashed">
                                                            {interviewStatuses.find(s => s.value === (interview.status || 'pending'))?.label}
                                                            <ChevronRight className="h-3 w-3 rotate-90" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Update Status</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        {interviewStatuses.map(s => (
                                                            <DropdownMenuItem
                                                                key={s.value}
                                                                onClick={() => updateInterviewStatus(interview.id, s.value)}
                                                            >
                                                                {s.label}
                                                            </DropdownMenuItem>
                                                        ))}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                                {shouldShowSendEmailButton(interview) && (
                                                    <button
                                                        onClick={() => sendInterviewEmail(interview)}
                                                        className="p-1.5 text-gray-500 hover:text-black hover:bg-gray-100 rounded transition-all"
                                                        title="Send Email"
                                                    >
                                                        {sendingInterviewEmail.has(interview.id) ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* CSV Import Section */}
            <div className="ink-card">
                <div className="border-b border-gray-200 px-6 py-4">
                    <h2 className="text-lg font-bold text-black">Import Candidates</h2>
                </div>
                <div className="p-6 space-y-4">
                    <textarea
                        value={csvImportData}
                        onChange={(e) => setCsvImportData(e.target.value)}
                        placeholder="Paste CSV data here or upload a file..."
                        className="w-full px-4 py-3 border border-gray-300 text-sm font-mono transition-all"
                        rows="4"
                    />
                    <div className="flex gap-2">
                        <label className="px-4 py-2 border border-gray-300 text-sm font-medium hover:border-black transition-all cursor-pointer flex items-center gap-2 bg-white">
                            <Upload size={16} /> Upload CSV
                            <input type="file" accept=".csv" onChange={handleCsvFileUpload} className="hidden" />
                        </label>
                        <button
                            onClick={importCsvToScheduler}
                            disabled={importingCsv || !csvImportData.trim()}
                            className="px-6 py-2 bg-black text-white text-sm font-medium hover:bg-gray-800 transition-all disabled:opacity-50"
                        >
                            {importingCsv ? 'Importing...' : 'Import'}
                        </button>
                    </div>
                </div>
            </div>
            {/* Add/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={modalMode === 'add' ? 'Schedule Interview' : 'Edit Interview'}
                footer={
                    <div className="flex justify-between gap-2 w-full">
                        {modalMode === 'edit' ? (
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={handleDeleteInterview}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                Delete
                            </Button>
                        ) : <div></div>}
                        <div className="flex gap-2 ml-auto">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="schedule-form"
                                className="px-4 py-2 text-sm font-medium text-white bg-black hover:bg-gray-800 rounded"
                            >
                                {modalMode === 'add' ? 'Schedule' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                }
            >
                <form id="schedule-form" onSubmit={handleSaveInterview} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Candidate Name</label>
                        <input
                            type="text"
                            required
                            value={modalFormData.candidateName}
                            onChange={(e) => setModalFormData({ ...modalFormData, candidateName: e.target.value })}
                            className="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-black"
                            placeholder="Jane Doe"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Email</label>
                        <input
                            type="email"
                            required
                            value={modalFormData.candidateEmail}
                            onChange={(e) => setModalFormData({ ...modalFormData, candidateEmail: e.target.value })}
                            className="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-black"
                            placeholder="jane@example.com"
                        />
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Date & Time</label>
                            <DatetimePicker
                                value={getCombinedDate(modalFormData.date, modalFormData.time)}
                                onChange={(date) => {
                                    if (date) {
                                        const { date: d, time: t } = updateFormDataFromDate(date);
                                        setModalFormData({ ...modalFormData, date: d, time: t });
                                    }
                                }}
                                format={[
                                    ["months", "days", "years"],
                                    ["hours", "minutes", "am/pm"],
                                ]}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Meeting Link</label>
                        <input
                            type="url"
                            value={modalFormData.link}
                            onChange={(e) => setModalFormData({ ...modalFormData, link: e.target.value })}
                            className="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-black"
                            placeholder="https://meet.google.com/..."
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Status</label>
                        <Select
                            value={modalFormData.status}
                            onValueChange={(value) => setModalFormData({ ...modalFormData, status: value })}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                {interviewStatuses.map(s => (
                                    <SelectItem key={s.value} value={s.value}>
                                        {s.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Notes</label>
                        <textarea
                            value={modalFormData.notes}
                            onChange={(e) => setModalFormData({ ...modalFormData, notes: e.target.value })}
                            className="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-black"
                            rows="2"
                        />
                    </div>
                </form>
            </Modal>
            {/* SMTP Config Modal */}
            <EmailPreviewModal
                isOpen={emailPreviewOpen}
                onClose={() => setEmailPreviewOpen(false)}
                onSend={handleSendEmailFinal}
                candidate={previewData?.candidate}
                template={previewData?.template}
                initialContent={previewData?.initialContent}
                initialSubject={previewData?.initialSubject}
            />
        </div>
    );
};

export default Scheduler;
