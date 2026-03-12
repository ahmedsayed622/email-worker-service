# Email Template Engine

Unified file-based template system for email rendering.

## Architecture

```
src/templates/
  engine/                    # Template engine core
    resolveTemplatePath.js   # Template path resolution with fallback
    loadTemplate.js          # Template file loading
    renderTemplate.js        # Simple {{var}} / {{{raw}}} rendering
    renderEmail.js           # Main orchestrator
  shared/                    # Default templates
    emails/
      data.ar.html           # DATA email (Arabic)
      data.en.html           # DATA email (English)
      no_data.ar.html        # NO_DATA email (Arabic)
      no_data.en.html        # NO_DATA email (English)
    signatures/
      ar/default.html        # Arabic signature wrapper
      en/default.html        # English signature wrapper
  domains/                   # Domain-specific overrides (optional)
    {domain}/
      reports/
        {reportCode}/
          data.ar.html       # Override for specific report
      signatures/
        ar/{key}.html        # Override signature
```

## Template Resolution

### Email Templates

Templates are resolved in this order:
1. `domains/{domain}/reports/{reportCode}/{event}.{lang}.html`
2. `shared/emails/{event}.{lang}.html`

Where:
- `{event}` = `data` (for DATA) or `no_data` (for NO_DATA)
- `{lang}` = `en` or `ar`

### Signature Templates

Signatures are resolved in this order:
1. `domains/{domain}/signatures/{lang}/{signatureKey}.html`
2. `shared/signatures/{lang}/{signatureKey}.html`
3. `shared/signatures/{lang}/default.html`

## Template Syntax

Simple placeholder replacement:

- `{{variable}}` - HTML-escaped variable
- `{{{variable}}}` - Raw (unescaped) variable (use only for pre-sanitized HTML like signatures)

### Available Variables

**Email templates:**
- `{{reportName}}` - Report display name
- `{{closeDate}}` - Close date
- `{{rowCount}}` - Number of rows (DATA only)
- `{{fileName}}` - Attachment file name (DATA only)
- `{{domain}}` - Domain name
- `{{reportCode}}` - Report code
- `{{{signatureHtml}}}` - Rendered signature (raw HTML)

**Signature templates:**
- `{{{signatureHtml}}}` - Company signature HTML with inlined images (raw)

## Usage

### In executeReports.js (Mail Rules System)

```javascript
import { renderEmail } from '../../../templates/engine/renderEmail.js';

// Fetch mail rule from WORKER_MAIL_RULES
const rule = await mailRulesPort.getRule({
  domain: 'finance',
  reportCode: 'fin-daily-confirmation',
  eventType: 'DATA', // or 'NO_DATA'
});

// Build context
const context = {
  domain: 'finance',
  reportCode: 'fin-daily-confirmation',
  reportName: 'Daily Finance Confirmation',
  closeDate: 20260302,
  eventType: 'DATA',
  languageCode: rule.languageCode || 'AR',
  rowCount: 150,
  fileName: 'report_20260302.xlsx',
};

// Render email
const { from, subject, html } = await renderEmail({
  rule,
  context,
  report,
  defaultFrom: 'noreply@alahlypharos.com',
});

// Send email
await emailPort.send({ from, to: recipients, subject, body: html, attachments });
```

### Direct Template Usage (Legacy/Simple)

```javascript
import { resolveTemplatePath, resolveSignaturePath } from '../../../templates/engine/resolveTemplatePath.js';
import { loadTemplate } from '../../../templates/engine/loadTemplate.js';
import { renderTemplate } from '../../../templates/engine/renderTemplate.js';
import { getDefaultSignatureHtml } from '../domain/emailTemplates/signatures/default_v1.signature.js';

// Load and render signature
const companySignatureHtml = await getDefaultSignatureHtml();
const signaturePath = await resolveSignaturePath({
  domain: 'operations',
  languageCode: 'AR',
  signatureKey: 'default',
});
const signatureTemplate = await loadTemplate(signaturePath);
const signatureHtml = renderTemplate(signatureTemplate, {
  signatureHtml: companySignatureHtml,
});

// Load and render email
const emailPath = await resolveTemplatePath({
  domain: 'operations',
  reportCode: 'ops-daily-operations',
  eventType: 'DATA',
  languageCode: 'AR',
});
const emailTemplate = await loadTemplate(emailPath);
const html = renderTemplate(emailTemplate, {
  reportName: 'Daily Operations',
  closeDate: 20260302,
  rowCount: 42,
  fileName: 'ops_20260302.xlsx',
  signatureHtml,
});
```

## Database Schema

Mail rules are stored in `back_office.WORKER_MAIL_RULES`:

```sql
DOMAIN          VARCHAR2  -- e.g., 'finance', 'operations', 'compliance'
REPORT_CODE     VARCHAR2  -- e.g., 'fin-daily-confirmation', or NULL for domain default
EVENT_TYPE      VARCHAR2  -- 'DATA' or 'NO_DATA'
LANGUAGE_CODE   VARCHAR2  -- 'AR' or 'EN'
TEMPLATE_KEY    VARCHAR2  -- Reserved for future use
SIGNATURE_KEY   VARCHAR2  -- e.g., 'default', 'manager'
FROM_ADDRESS    VARCHAR2  -- Optional from address
SUBJECT_SUFFIX  VARCHAR2  -- Optional subject suffix
NOTIFY_ENABLED  CHAR(1)   -- 'Y' or 'N'
IS_ACTIVE       CHAR(1)   -- 'Y' or 'N'
```

Recipients are stored in `back_office.WORKER_MAIL_RECIPIENTS`:

```sql
RULE_ID         NUMBER    -- FK to WORKER_MAIL_RULES
ADDRESS         VARCHAR2  -- Email address
RECIP_TYPE      VARCHAR2  -- 'TO', 'CC', 'BCC'
IS_ACTIVE       CHAR(1)   -- 'Y' or 'N'
```

## Adding New Templates

### Domain Override Example

To override the finance DATA email in English:

1. Create file: `src/templates/domains/finance/reports/fin-daily-confirmation/data.en.html`
2. Use the same variables as shared templates
3. The system will automatically use your override

### Custom Signature Example

To add a manager signature:

1. Create file: `src/templates/shared/signatures/en/manager.html`
2. Set `SIGNATURE_KEY = 'manager'` in `WORKER_MAIL_RULES`
3. The signature will be used automatically

## Signature Handling

Company signatures (e.g., `Signatures/AlahlyINV_Signature.htm`) are:
1. Loaded from filesystem
2. Images are inlined as base64 data URIs (for Outlook compatibility)
3. Wrapped in signature template wrapper
4. Injected into email template via `{{{signatureHtml}}}`

This preserves existing signature infrastructure while allowing template customization.

## Migration Notes

### Removed Hardcoded Functions

The following functions are **no longer used** and have been replaced by the template engine:

- `buildEmailBody()` from `emailTemplate.js`
- `buildNoDataEmail()` from `noData.template.js`

These files are kept for reference but should not be imported in new code.

### Backward Compatibility

Legacy code (e.g., `executeDayClose.js`) continues to work by using the template engine directly with default language (AR).

## Best Practices

1. **Always escape user input** - Use `{{var}}` by default
2. **Use raw only for trusted HTML** - `{{{signatureHtml}}}` is pre-sanitized
3. **Test both languages** - Ensure AR and EN templates render correctly
4. **Keep templates simple** - Complex logic belongs in code, not templates
5. **Document custom templates** - Add comments in domain overrides
6. **Fallback gracefully** - Shared templates should always exist

## Troubleshooting

**Template not found error:**
- Check file naming: `{event}.{lang}.html` (lowercase)
- Verify shared templates exist as fallback
- Check file permissions

**Variables not rendering:**
- Verify variable name matches exactly (case-sensitive)
- Ensure context object includes the variable
- Check for typos: `{{varName}}` not `{{ varName }}`

**Signature not showing:**
- Verify `Signatures/AlahlyINV_Signature.htm` exists
- Check signature wrapper templates exist
- Ensure `{{{signatureHtml}}}` uses triple braces (raw)

## Testing

To test templates locally:

```javascript
import { renderEmail } from './src/templates/engine/renderEmail.js';

const mockRule = {
  fromAddress: 'test@example.com',
  subjectSuffix: ' - Test',
  signatureKey: 'default',
  languageCode: 'EN',
};

const mockContext = {
  domain: 'finance',
  reportCode: 'test-report',
  reportName: 'Test Report',
  closeDate: 20260302,
  eventType: 'DATA',
  languageCode: 'EN',
  rowCount: 10,
  fileName: 'test.xlsx',
};

const mockReport = {
  subject: 'Test Report - {CLOSE_DATE}',
};

const result = await renderEmail({
  rule: mockRule,
  context: mockContext,
  report: mockReport,
  defaultFrom: 'noreply@test.com',
});

console.log(result.subject);
console.log(result.html);
```

## Future Enhancements

- [ ] Support for conditional blocks in templates
- [ ] Support for loops/iterations
- [ ] Template validation on startup
- [ ] Hot-reload for development
- [ ] Multi-part emails (text + HTML)
- [ ] Markdown support
- [ ] Template linting
