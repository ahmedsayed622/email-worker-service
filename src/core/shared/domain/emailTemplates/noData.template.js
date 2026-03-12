export function buildNoDataEmail({ reportName, closeDate, signatureHtml }) {
  const signature = signatureHtml || '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; color: #111; line-height: 1.6; }
    .container { max-width: 720px; margin: 0 auto; padding: 12px 16px; }
  </style>
</head>
<body>
  <div class="container">
    <p>Dear,</p>
    <p>The report <strong>${reportName}</strong> for close date <strong>${closeDate}</strong> has no data for this run.</p>
    ${signature}
  </div>
</body>
</html>`;
}
