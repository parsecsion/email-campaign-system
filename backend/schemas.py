from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from config import Config

# Constants (mirrors central configuration)
MAX_RECIPIENTS = Config.MAX_RECIPIENTS


class Recipient(BaseModel):
    Email: EmailStr
    Name: Optional[str] = None

    # Allow extra fields for variable substitution
    model_config = ConfigDict(extra="allow")


class EmailCampaignRequest(BaseModel):
    senderEmail: EmailStr
    subject: str = Field(..., max_length=200)
    recipients: List[Recipient]

    templateId: Optional[str] = None
    htmlTemplate: Optional[str] = None
    plainTemplate: Optional[str] = None

    @field_validator("recipients")
    @classmethod
    def validate_recipients_limit(cls, value: List[Recipient]) -> List[Recipient]:
        if len(value) > MAX_RECIPIENTS:
            raise ValueError(f"Too many recipients. Maximum allowed: {MAX_RECIPIENTS}")
        return value

    @model_validator(mode="before")
    @classmethod
    def check_template_requirements(cls, values: Any) -> Any:
        if not isinstance(values, dict):
            return values

        template_id = values.get("templateId")
        html_template = values.get("htmlTemplate")
        plain_template = values.get("plainTemplate")

        # Check if templateId is present and non-empty
        has_template_id = bool(template_id) and str(template_id).strip() != ""

        # Check if custom templates are present and non-empty
        has_html = bool(html_template) and str(html_template).strip() != ""
        has_plain = bool(plain_template) and str(plain_template).strip() != ""
        has_custom = has_html and has_plain

        if not has_template_id and not has_custom:
            if has_html and not has_plain:
                raise ValueError(
                    "Missing required field: 'plainTemplate' (required when using 'htmlTemplate')"
                )
            if has_plain and not has_html:
                raise ValueError(
                    "Missing required field: 'htmlTemplate' (required when using 'plainTemplate')"
                )
            raise ValueError(
                "Missing required field: either 'templateId' or both 'htmlTemplate' and 'plainTemplate'"
            )

        return values
