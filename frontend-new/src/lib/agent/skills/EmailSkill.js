import api from '@/utils/api';

export const EmailSkill = {
    name: 'email',
    description: 'Draft and send emails',

    patterns: [
        // Kept for backward compatibility
        {
            regex: /list (my |)drafts/i,
            handler: 'listDrafts',
            example: 'list drafts'
        },
        {
            regex: /draft (email|msg|message) to (.+) about (.+)/i,
            handler: 'draftEmail',
            example: 'draft email to John about Job Offer'
        },
        {
            regex: /send (email|msg|message) to (.+)/i,
            handler: 'sendEmail',
            example: 'send email to John'
        }
    ],

    async draftEmail(matches) {
        // Pattern: draft email to [Name] about [Subject]
        const name = (matches[2] || "").trim();
        const subject = (matches[3] || "").trim();

        try {
            let recipientEmail = "";
            let recipientData = [];

            // 0. Check if input is directly an email
            if (name.includes('@')) {
                recipientEmail = name;
                // Try to find name for this email, otherwise default
                const searchRes = await api.get(`/api/candidates?search=${encodeURIComponent(name)}`);
                const candidates = searchRes.data.candidates || [];
                if (candidates.length > 0) {
                    recipientData = [{ Email: candidates[0].email, Name: candidates[0].full_name }];
                } else {
                    recipientData = [{ Email: name, Name: "there" }];
                }
            } else {
                // 1. Try to find the candidate's email by name
                const searchRes = await api.get(`/api/candidates?search=${encodeURIComponent(name)}`);
                const candidates = searchRes.data.candidates || [];

                if (candidates.length > 0) {
                    recipientEmail = candidates[0].email;
                    recipientData = [{ Email: recipientEmail, Name: candidates[0].full_name }];
                } else {
                    return {
                        message: `I couldn't find a candidate named "${name}". Please provide their **email address** directly to draft the email.`,
                        type: 'error'
                    };
                }
            }

            // 2. Create the draft via API
            const draftPayload = {
                subject: subject,
                html_content: `<p>Hi ${name},</p><p>Regarding: ${subject}</p>`,
                recipients: JSON.stringify(recipientData),
                template_id: null
            };

            const response = await api.post('/api/drafts', draftPayload);
            const draft = response.data.draft;

            return {
                message: `Draft created successfully! (ID: ${draft.id})\n\n**To: ${name} <${recipientEmail}>**\n**Subject:** ${subject}`,
                type: 'text',
                data: draft
            };

        } catch (error) {
            console.error(error);
            return { message: "Failed to create draft. " + (error.response?.data?.error || error.message), type: 'error' };
        }
    },

    async sendEmail(matches) {
        // Pattern: send email to [Name]
        const name = matches[2].trim();

        try {
            // 1. Find candidate
            const searchRes = await api.get(`/api/candidates?search=${encodeURIComponent(name)}`);
            const candidates = searchRes.data.candidates || [];

            if (candidates.length === 0) {
                return { message: `I couldn't find "${name}".`, type: 'error' };
            }
            const candidate = candidates[0];

            // 2. Check for drafts
            const draftsRes = await api.get('/api/drafts');
            const drafts = draftsRes.data.drafts || [];

            const relevantDraft = drafts.find(d => d.recipients && d.recipients.includes(candidate.email));

            if (!relevantDraft) {
                return { message: `I didn't find any pending drafts for **${candidate.first_name}**. Please draft one first.`, type: 'text' };
            }

            // 3. Send it
            const payload = {
                senderEmail: relevantDraft.sender_email,
                subject: relevantDraft.subject,
                recipients: JSON.parse(relevantDraft.recipients),
                htmlTemplate: relevantDraft.html_content,
                plainTemplate: "Please view this email in an HTML-compatible client."
            };

            await api.post('/api/send-emails', payload);

            return {
                message: `Email sent to **${candidate.first_name}** (Subject: ${relevantDraft.subject}).`,
                type: 'text'
            };

        } catch (error) {
            console.error(error);
            return { message: "Failed to send email. " + (error.response?.data?.error || error.message), type: 'error' };
        }
    },

    async listDrafts() {
        try {
            const res = await api.get('/api/drafts');
            const drafts = res.data.drafts || [];

            if (drafts.length === 0) {
                return { message: "You have no saved drafts.", type: 'text' };
            }

            const format = drafts.map(d => `- **[ID: ${d.id}]** To: ${(d.recipients || "").substring(0, 20)}... | Subject: ${d.subject}`).join('\n');
            return {
                message: `**Your Drafts:**\n${format}`,
                type: 'text'
            };
        } catch (error) {
            return { message: "Failed to list drafts.", type: 'error' };
        }
    },

    async editDraft(matches) {
        // matches: [null, draftId, field, newValue]
        const draftId = matches[1];
        const field = matches[2];
        const newValue = matches[3];

        if (!draftId) return { message: "I need a Draft ID to edit.", type: 'error' };

        const payload = {};
        if (field === 'subject') payload.subject = newValue;
        else if (field === 'content' || field === 'body') payload.html_content = newValue;
        else return { message: "I can only edit 'subject' or 'body'.", type: 'error' };

        try {
            await api.put(`/api/drafts/${draftId}`, payload);
            return { message: `Draft ${draftId} updated successfully.`, type: 'text' };
        } catch (error) {
            return { message: "Failed to update draft.", type: 'error' };
        }
    },

    async deleteDraft(matches) {
        const draftId = matches[1];
        try {
            await api.delete(`/api/drafts/${draftId}`);
            return { message: `Draft ${draftId} deleted.`, type: 'text' };
        } catch (error) {
            return { message: "Failed to delete draft.", type: 'error' };
        }
    }
};
