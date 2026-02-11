import api from '@/utils/api';

export const CandidateSkill = {
    name: 'candidate',
    description: 'Manage candidates (find, list, details) - US and UK',

    // Note: Patterns are kept for legacy/other implementations, 
    // but Brain V2 uses "tool" names directly.
    patterns: [
        {
            regex: /find uk (candidate|candidates) (.+)/i,
            handler: 'findUKCandidates',
            example: 'find uk candidate John'
        },
        {
            regex: /find (candidate|candidates) (.+)/i,
            handler: 'findCandidates',
            example: 'find candidate John'
        },
        {
            regex: /show (all |)candidates/i,
            handler: 'listCandidates',
            example: 'show all candidates'
        },
        {
            regex: /count candidates/i,
            handler: 'countCandidates',
            example: 'count candidates'
        },
        {
            regex: /add candidate (.+) (.+@.+\..+)/i,
            handler: 'addCandidate',
            example: 'add candidate John Doe john@example.com'
        },
        {
            regex: /delete candidate (.+)/i,
            handler: 'deleteCandidate',
            example: 'delete candidate John Doe'
        }
    ],

    async findCandidates(matches) {
        const query = matches[2]; // match group 2
        try {
            const res = await api.get(`/api/candidates?search=${encodeURIComponent(query)}`);
            const candidates = res.data.candidates || [];

            if (candidates.length === 0) {
                return {
                    message: `I couldn't find any US candidates matching "${query}". (Pro-tip: Ask for 'UK candidate' if appropriate).`,
                    type: 'text'
                };
            }

            return {
                message: `I found ${candidates.length} US candidate(s) matching "${query}".`,
                type: 'candidate-list',
                data: candidates
            };
        } catch {
            return { message: "I encountered an error searching for US candidates.", type: 'error' };
        }
    },

    async findUKCandidates(matches) {
        const query = matches[2]; // match group 2
        try {
            // Updated to use Unified API
            const res = await api.get(`/api/candidates?country=UK&search=${encodeURIComponent(query)}`);
            const candidates = res.data.candidates || [];

            if (candidates.length === 0) {
                return {
                    message: `I couldn't find any UK candidates matching "${query}".`,
                    type: 'text'
                };
            }

            return {
                message: `I found ${candidates.length} UK candidate(s) matching "${query}".`,
                type: 'candidate-list',
                data: candidates
            };
        } catch (e) {
            console.error(e);
            return { message: "I encountered an error searching for UK candidates.", type: 'error' };
        }
    },

    async listCandidates() {
        try {
            const res = await api.get('/api/candidates?limit=10');
            return {
                message: "Here are the most recent candidates.",
                type: 'candidate-list',
                data: res.data.candidates || []
            };
        } catch {
            return { message: "Failed to load candidates.", type: 'error' };
        }
    },

    async countCandidates() {
        try {
            const res = await api.get('/api/candidates?limit=1');
            return {
                message: `There are currently ${res.data.total} candidates in the US database.`,
                type: 'text'
            };
        } catch {
            return { message: "Couldn't retrieve the count.", type: 'error' };
        }
    },

    async addCandidate(matches) {
        const name = matches[1].trim();
        const email = matches[2].trim();

        try {
            // Split name into first and last
            const nameParts = name.split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

            await api.post('/api/candidates', {
                first_name: firstName,
                last_name: lastName,
                email: email,
                status: 'new'
            });

            return {
                message: `Successfully added candidate **${name}** (${email}).`,
                type: 'text'
            };
        } catch (error) {
            console.error(error);
            if (error.response?.status === 400 && error.response?.data?.error?.includes('email')) {
                // Try to find the existing candidate to give better feedback
                try {
                    const searchRes = await api.get(`/api/candidates?search=${encodeURIComponent(email)}`);
                    const existing = searchRes.data.candidates?.[0];
                    if (existing) {
                        return {
                            message: `Candidate **${existing.first_name} ${existing.last_name}** already exists with email ${email} (ID: ${existing.id}).`,
                            type: 'text'
                        };
                    }
                } catch (ignore) { }
            }
            return { message: `Failed to add candidate. ${error.response?.data?.error || ''}`, type: 'error' };
        }
    },

    async deleteCandidate(matches) {
        const query = matches[1].trim();

        try {
            // 1. Search to find the ID
            const searchRes = await api.get(`/api/candidates?search=${encodeURIComponent(query)}`);
            const candidates = searchRes.data.candidates || [];

            if (candidates.length === 0) {
                return { message: `I couldn't find any candidate named "${query}" to delete.`, type: 'text' };
            }

            if (candidates.length > 1) {
                return {
                    message: `I found multiple candidates matching "${query}". Please be more specific (e.g., provide the full name).`,
                    type: 'candidate-list',
                    data: candidates
                };
            }

            // 2. Delete the single match
            const candidate = candidates[0];
            await api.delete(`/api/candidates/${candidate.id}`);

            return {
                message: `Successfully deleted candidate **${candidate.first_name} ${candidate.last_name}** (${candidate.email}).`,
                type: 'text'
            };

        } catch (error) {
            return { message: "Failed to delete candidate.", type: 'error' };
        }
    }
};
