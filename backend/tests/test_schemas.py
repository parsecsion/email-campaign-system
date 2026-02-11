import pytest

from schemas import EmailCampaignRequest, MAX_RECIPIENTS, Recipient


def _recipient(index: int) -> dict:
    return {"Email": f"user{index}@example.com", "Name": f"User {index}"}


def test_recipient_allows_extra_fields():
    recipient = Recipient(Email="alice@example.com", Name="Alice", role="Engineer")

    assert recipient.Email == "alice@example.com"
    assert recipient.model_dump()["role"] == "Engineer"


def test_campaign_requires_template_id_or_both_custom_templates():
    payload = {
        "senderEmail": "sender@example.com",
        "subject": "Hello",
        "recipients": [_recipient(1)],
        "htmlTemplate": "<p>Hello</p>",
    }

    with pytest.raises(ValueError, match="plainTemplate"):
        EmailCampaignRequest(**payload)


def test_campaign_enforces_max_recipients_limit():
    recipients = [_recipient(i) for i in range(MAX_RECIPIENTS + 1)]
    payload = {
        "senderEmail": "sender@example.com",
        "subject": "Hello",
        "recipients": recipients,
        "templateId": "welcome",
    }

    with pytest.raises(ValueError, match="Too many recipients"):
        EmailCampaignRequest(**payload)
