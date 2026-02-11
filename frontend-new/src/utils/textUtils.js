export const extractVariables = (text) => {
  if (!text) return [];
  const variablePattern = /\{([A-Za-z][A-Za-z0-9_]*)\}/g;
  const matches = [];
  let match;
  while ((match = variablePattern.exec(text)) !== null) {
    const varName = match[1];
    if (!matches.includes(varName)) {
      matches.push(varName);
    }
  }
  return matches;
};

export const stripHtml = (html) => {
  if (!html) return '';
  // Replace <br> and </p> and </div> with newlines
  let text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/tr>/gi, '\n'); // Table rows to newlines

  // Strip all other tags
  text = text.replace(/<[^>]*>?/gm, '');

  // Decode common entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');

  // Remove multiple empty lines
  return text.replace(/\n\s*\n/g, '\n\n').trim();
};

export const convertTextToHtml = (text, type = 'html') => {
  if (!text) return '';

  // If type is 'html' (formerly branded), return the text as-is (Raw HTML)
  // The user will provide the full HTML code including structure
  if (type === 'html' || type === 'branded') {
    return text;
  }

  // Type 'plain' or default text processing
  // Replace line breaks with <br> tags
  // Using \r\n handling first
  let html = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Split by double line breaks to create paragraphs
  const paragraphs = html.split(/\n\n+/);

  // Wrap each paragraph in <p> tags and convert single line breaks to <br>
  const formattedParagraphs = paragraphs.map(para => {
    const lines = para.split('\n');
    const formattedLines = lines.map(line => {
      // Preserve HTML tags in the line
      return line.trim();
    }).filter(line => line.length > 0);
    if (formattedLines.length === 0) return '';
    return `<p style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; margin: 0 0 1em 0;">${formattedLines.join('<br>')}</p>`;
  }).filter(p => p.length > 0);

  const content = formattedParagraphs.join('');

  // Simple clean wrapper for plain text emails
  return `<html>
<body style="margin:0; padding:20px; background-color:#ffffff; font-family:Arial, sans-serif; color:#333;">
  ${content}
</body>
</html>`;
};
