"""
Legacy, code-defined email templates.

The primary source of truth for templates in this system is the `Template`
database model in `database.py`. These in-memory templates are kept only as
bootstrap defaults and a last-resort fallback when a corresponding DB
template cannot be found.
"""


def get_all_templates():
    return [
        {
            "id": "interview_confirmation",
            "name": "Interview Confirmation",
            "subject": "Interview Confirmation - {CandidateName}",
            "variables": ["CandidateName", "Link", "Time"],
            "plain_template": "Hi {CandidateName},\n\nYour interview is confirmed for {Time}.\n\nPlease join using this link: {Link}\n\nBest regards,\nRecruiting Team",
            "html_template": "<p>Hi <strong>{CandidateName}</strong>,</p><p>Your interview is confirmed for <strong>{Time}</strong>.</p><p>Please join using this link: <a href=\"{Link}\">{Link}</a></p><p>Best regards,<br>Recruiting Team</p>"
        },
        {
            "id": "follow_up_email",
            "name": "Follow-up Email",
            "subject": "Following up on your application",
            "variables": ["CandidateName"],
            "plain_template": "Hi {CandidateName},\n\nWe are reviewing your application and will get back to you soon.\n\nBest,\nRecruiting Team",
            "html_template": "<p>Hi {CandidateName},</p><p>We are reviewing your application and will get back to you soon.</p><p>Best,<br>Recruiting Team</p>"
        },
        {
            "id": "general_update",
            "name": "General Update",
            "subject": "Update regarding your status",
            "variables": ["CandidateName"],
            "plain_template": "Hello {CandidateName},\n\nWe have an update regarding your status. Please check your portal.\n\nRegards,\nTeam",
            "html_template": "<p>Hello {CandidateName},</p><p>We have an update regarding your status. Please check your portal.</p><p>Regards,<br>Team</p>"
        }
    ]

def get_template(template_id):
    templates = get_all_templates()
    for t in templates:
        if t['id'] == template_id:
            return t
    return None

def get_template_summary():
    return [{"id": t["id"], "name": t["name"]} for t in get_all_templates()]
