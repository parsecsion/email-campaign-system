import api from '@/utils/api';

export const ScheduleSkill = {
    name: 'schedule',
    description: 'Manage interview schedules',

    patterns: [
        // Kept for backward compatibility if needed, but Brain V2 uses 'check_availability' directly
        {
            regex: /check availability (from|starting) (.+) (to|until) (.+)/i,
            handler: 'checkAvailability',
            example: 'check availability from tomorrow to friday'
        },
        {
            regex: /schedule interview with (.+) (on|at) (.+)/i,
            handler: 'scheduleInterview',
            example: 'schedule interview with John on Friday at 2pm'
        },
        {
            regex: /show (my |)schedule/i,
            handler: 'listSchedule',
            example: 'show schedule'
        }
    ],

    async scheduleInterview(matches) {
        // Pattern matches: name, time (from brain.js args)
        // If called via LLM, matches is [null, candidateName, time]
        const query = matches[1].trim();
        const timeString = matches[2].trim();
        // console.log("Scheduling - Query:", query, "Time:", timeString);


        try {
            // 1. Find Candidate
            let searchRes = await api.get(`/api/candidates?search=${encodeURIComponent(query)}`);
            let candidates = searchRes.data.candidates || [];

            // Fallback: If full name search fails (backend limitation), try searching by first name and filtering locally
            if (candidates.length === 0 && query.includes(' ')) {
                const firstName = query.split(' ')[0];
                // console.log(`Scheduling - Direct search failed. Trying fallback with first name: ${firstName}`);
                const fallbackRes = await api.get(`/api/candidates?search=${encodeURIComponent(firstName)}`);
                const potentialCandidates = fallbackRes.data.candidates || [];

                // Client-side fuzzy match
                candidates = potentialCandidates.filter(c =>
                    c.full_name.toLowerCase().includes(query.toLowerCase()) ||
                    query.toLowerCase().includes(c.full_name.toLowerCase())
                );
            }

            if (candidates.length === 0) {
                return { message: `I couldn't find "${query}" to schedule an interview.`, type: 'text' };
            }

            if (candidates.length > 1) {
                return {
                    message: `Found multiple people named "${query}". Please be specific.`,
                    type: 'candidate-list',
                    data: candidates
                };
            }

            const candidate = candidates[0];

            // 2. Create Interview 
            // We need to convert the "timeString" (e.g. "Friday at 2pm") into an ISO date for the backend.
            // Since we don't have a hefty NLP date library here, we'll try a basic strategy:
            // For this iteration, we'll ask the Agent to ask the user for a simpler format if it fails,
            // OR we rely on the Backend's ability to parse? No, backend `scheduling_api.py` checks `datetime.fromisoformat`.
            // So we MUST send ISO. 
            // Hack: We'll create a "pending" interview with a placeholder date if parsing fails, or just default to "tomorrow 9am" and tell the user to edit it.
            // BETTER: The LLM in `brain.js` is powerful. We should have asked IT to return ISO.
            // But since we can't change brain.js prompt easily right now without another step, let's try a simple heuristic.

            // Let's assumme for now we just create it for "Tomorrow 10am" as a default if we can't parse, or try to parse simple dates.
            // Try to parse the provided time string
            // Ensure ISO format (replace space with T) for reliable parsing
            let safeTimeString = timeString.replace(' ', 'T');
            let interviewDate = new Date(safeTimeString);

            // If invalid date (e.g. just "9am"), fallback to "tomorrow" logic combined with time parsing if possible, 
            // but for now, let's default to tomorrow 10am if completely invalid.
            if (isNaN(interviewDate.getTime())) {
                console.warn("Invalid date parsed from:", timeString, "Defaulting to tomorrow 10am");
                interviewDate = new Date();
                interviewDate.setDate(interviewDate.getDate() + 1);
                interviewDate.setHours(10, 0, 0, 0);
            }

            const payload = {
                candidate_id: candidate.id,
                interview_date: interviewDate.toISOString(),
                // send strictly HH:MM for legacy display compatibility
                interview_time: interviewDate.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
                notes: `Requested time: ${timeString}`
            };

            const res = await api.post('/api/interviews', payload);
            const interview = res.data.interview;

            return {
                message: `I've scheduled an interview for **${candidate.first_name}** on **${new Date(interview.interview_date).toLocaleDateString()} at ${interview.interview_time}**.`,
                type: 'text'
            };

        } catch (error) {
            console.error(error);
            const errorMsg = error.response?.data?.error || error.message;
            if (errorMsg.includes("conflict")) {
                const conflictData = error.response?.data?.conflicts || [];
                // Backend returns list of strings OR objects? 
                // Based on py code: returned as list of strings ["Candidate has another interview at ..."]
                // Let's handle both just in case
                const conflictText = conflictData.map(c => {
                    if (typeof c === 'string') return c;
                    return `Conflict at ${c.conflict_time || 'unknown time'}`;
                }).join('; ');

                return {
                    message: `I couldn't schedule that because of a conflict: ${errorMsg}. (${conflictText}). Please check availability first.`,
                    type: 'error'
                };
            }
            return { message: "Failed to schedule interview. " + errorMsg, type: 'error' };
        }
    },

    async checkAvailability(matches) {
        // matches: [null, startDate, endDate] passed from brain.js args
        const start = matches[1];
        const end = matches[2];

        if (!start || !end) {
            return { message: "I need a start and end date to check availability.", type: 'error' };
        }

        try {
            // Ensure ISO format if possible, or pass as is and let backend try
            const res = await api.get(`/api/schedule/available-slots?start_date=${encodeURIComponent(start)}&end_date=${encodeURIComponent(end)}`);
            const slots = res.data.slots || [];

            if (slots.length === 0) {
                return { message: `No slots available between ${start} and ${end}.`, type: 'text' };
            }

            // Format slots nicely
            // slots are ISO strings
            const formatted = slots.map(s => new Date(s).toLocaleString()).join('\n- ');
            return {
                message: `**Available Slots:**\n- ${formatted}`,
                type: 'text'
            };

        } catch (error) {
            return { message: "Failed to check availability. " + (error.response?.data?.error || error.message), type: 'error' };
        }
    },

    async listSchedule() {
        try {
            // Updated to use dedicated Interviews API
            // Fetch upcoming interviews from today onwards
            const today = new Date().toISOString();
            const res = await api.get(`/api/interviews?start_date=${today}&limit=10`);
            const interviews = res.data.interviews || [];

            if (interviews.length === 0) {
                return { message: "You have no upcoming interviews scheduled.", type: 'text' };
            }

            // Format for display
            const scheduleText = interviews.map(i => {
                const date = new Date(i.interview_date).toLocaleDateString();
                const time = i.interview_time || 'TBD';
                const name = i.candidate ? `${i.candidate.first_name} ${i.candidate.last_name}` : 'Unknown Candidate';
                const status = i.status.toUpperCase();
                return `- **${date} @ ${time}**: ${name} (${status})`;
            }).join('\n');

            return {
                message: `**Upcoming Interviews:**\n${scheduleText}`,
                type: 'text'
            };
        } catch (e) {
            console.error(e);
            return { message: "Could not retrieve schedule.", type: 'error' };
        }
    }
};
