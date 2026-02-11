import re
from email.mime.text import MIMEText
from email import encoders

def validate_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def extract_first_name(full_name):
    """Extract first name from full name"""
    return full_name.split()[0] if full_name else ""

def clean_html_spacing(html_content):
    """Clean up HTML spacing to prevent multiple line breaks"""
    if not html_content:
        return ""
    # Remove multiple consecutive <br> tags (more than 2)
    html_content = re.sub(r'(<br\s*/?>){3,}', '<br><br>', html_content, flags=re.IGNORECASE)
    
    # Remove multiple consecutive <p> tags with only whitespace
    html_content = re.sub(r'<p[^>]*>\s*</p>\s*<p[^>]*>\s*</p>', '<p></p>', html_content, flags=re.IGNORECASE)
    
    # Remove empty paragraphs followed by more empty paragraphs (using a loop or reliable regex)
    # The original regex was: r'(<p[^>]*>\s*</p>\s*){2,}'
    html_content = re.sub(r'(<p[^>]*>\s*</p>\s*){2,}', '<p></p>', html_content, flags=re.IGNORECASE)
    
    # Normalize multiple spaces to single space
    html_content = re.sub(r' +', ' ', html_content)
    
    # Remove spaces before closing tags
    html_content = re.sub(r'\s+</', '</', html_content)
    
    return html_content

def html_to_plain_text(html_content):
    """Convert HTML to clean plain text with proper spacing"""
    if not html_content:
        return ""
        
    # First clean the HTML spacing
    html_content = clean_html_spacing(html_content)
    
    # Convert <p> tags to line breaks
    text = re.sub(r'<p[^>]*>', '', html_content)
    text = re.sub(r'</p>', '\n\n', text)
    
    # Convert <br> tags to line breaks
    text = re.sub(r'<br\s*/?>', '\n', text, flags=re.IGNORECASE)
    
    # Remove other HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    
    # Replace multiple line breaks with double line breaks
    text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)
    
    # Remove extra whitespace
    text = re.sub(r'[ \t]+', ' ', text)
    
    # Remove leading/trailing whitespace from lines
    lines = [line.strip() for line in text.split('\n')]
    
    # Remove empty lines but keep single empty lines between paragraphs
    cleaned_lines = []
    prev_empty = False
    for line in lines:
        if line == '':
            if not prev_empty:
                cleaned_lines.append('')
            prev_empty = True
        else:
            cleaned_lines.append(line)
            prev_empty = False
    
    return '\n'.join(cleaned_lines)

def personalize_email(template, data):
    """Personalize email template with data"""
    if not template:
        return ""
    personalized = template
    
    # Handle Name specially - extract first name
    if 'Name' in data and data['Name']:
        first_name = extract_first_name(data['Name'])
        personalized = re.sub(r'\{Name\}', first_name, personalized, flags=re.IGNORECASE)
    
    # Replace all other variables
    for key, value in data.items():
        if key != 'Name':
            pattern = r'\{' + re.escape(key) + r'\}'
            personalized = re.sub(pattern, str(value), personalized, flags=re.IGNORECASE)
    
    # Clean up spacing issues
    personalized = clean_html_spacing(personalized)
    
    return personalized

def ensure_html_formatting(html_content):
    """Ensure HTML is complete and styled for consistent rendering in Gmail/Outlook."""
    if not html_content:
        return ""
    
    style = "font-family: Arial, sans-serif; color: #333; line-height: 1.6;"
    
    # Basic safety: strip script tags (security)
    html_content = re.sub(r'<script[^>]*>.*?</script>', '', html_content, flags=re.IGNORECASE | re.DOTALL)
    
    # Detect if content has paragraph tags (proper HTML structure)
    has_paragraph_tags = bool(re.search(r'<p[^>]*>', html_content, re.IGNORECASE))
    
    # Detect if content has other HTML tags (div, span, strong, etc.)
    has_other_html_tags = bool(re.search(r'<(div|span|strong|em|b|i|u|h[1-6]|ul|ol|li|a|img)', html_content, re.IGNORECASE))
    
    # Detect if content only has <br> tags (needs conversion to paragraphs)
    has_only_br_tags = bool(re.search(r'<br', html_content, re.IGNORECASE)) and not has_paragraph_tags
    
    # Detect if already a full HTML document
    is_full_html = "<html" in html_content.lower()
    
    if is_full_html:
        # Full HTML document - just add inline styles to paragraphs if missing
        html_content = re.sub(
            r'<p(?![^>]*style=)([^>]*)>',
            rf'<p\1 style="{style}">',
            html_content,
            flags=re.IGNORECASE
        )
        # Ensure body tag exists with styling
        if "<body" not in html_content.lower():
            html_content = f"<html><body style='{style}; background-color:#ffffff; margin:0; padding:20px;'>{html_content}</body></html>"
    elif has_paragraph_tags or has_other_html_tags:
        # Quill HTML (has <p>, <div>, etc.) - use directly without newline replacements
        # Just add inline styles to paragraphs that don't have them
        html_content = re.sub(
            r'<p(?![^>]*style=)([^>]*)>',
            rf'<p\1 style="{style}">',
            html_content,
            flags=re.IGNORECASE
        )
        
        # Wrap in full HTML structure for consistent rendering
        html_content = f"""\
<html>
  <body style="{style}; background-color:#ffffff; margin:0; padding:20px;">
    {html_content}
  </body>
</html>
"""
    elif has_only_br_tags:
        # Content has only <br> tags - convert to proper <p> tags
        # Split by <br> tags and wrap each segment in <p> tags
        html_content = html_content.strip()
        # Replace <br> and <br/> with paragraph breaks
        segments = re.split(r'<br\s*/?>', html_content, flags=re.IGNORECASE)
        paragraphs = []
        for segment in segments:
            segment = segment.strip()
            if segment:
                paragraphs.append(f"<p style='{style}'>{segment}</p>")
        html_content = ''.join(paragraphs) if paragraphs else f"<p style='{style}'></p>"
        
        # Wrap in full HTML structure for consistent rendering
        html_content = f"""\
<html>
  <body style="{style}; background-color:#ffffff; margin:0; padding:20px;">
    {html_content}
  </body>
</html>
"""
    else:
        # Plain text - convert to HTML with proper formatting
        html_content = html_content.strip()
        html_content = html_content.replace("\r\n", "\n")
        html_content = html_content.replace("\n\n", f"</p><p style='{style}'>")
        html_content = html_content.replace("\n", "<br>")
        html_content = f"<p style='{style}'>{html_content}</p>"
        
        # Wrap in full HTML structure for consistent rendering
        html_content = f"""\
<html>
  <body style="{style}; background-color:#ffffff; margin:0; padding:20px;">
    {html_content}
  </body>
</html>
"""
    
    return html_content

def make_mime_html_base64(content):
    """
    Clean up empty quill paragraphs and return a base64-encoded MIMEText HTML part.
    Using base64 avoids relay double-encoding issues that expose quoted-printable artifacts.
    """
    if not content:
        return MIMEText("", "html", "utf-8")
    
    # Remove empty paragraphs Quill sometimes inserts: <p><br></p> or <p>&nbsp;</p>
    # Also collapse consecutive empty paragraphs into a single paragraph removal.
    content = re.sub(r'(?i)<p>\s*(?:&nbsp;|<br\s*/?>|\s)*\s*</p>', '', content)
    content = re.sub(r'(?i)(\n|\r)+', '\n', content)  # normalize whitespace/newlines
    
    part = MIMEText(content, "html", "utf-8")
    # Use base64 for the HTML part to avoid relay re-encoding issues
    encoders.encode_base64(part)
    part.replace_header("Content-Transfer-Encoding", "base64")
    return part
