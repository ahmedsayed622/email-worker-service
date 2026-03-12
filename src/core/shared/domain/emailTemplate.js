export function buildEmailBody({ reportName, closeDate, rowCount, fileName }) {
  const safeRowCount = rowCount === 0 || rowCount === null || rowCount === undefined ? '—' : rowCount;

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تقرير يومي</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f6f9;
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      color: #1f2a37;
    }
    .container {
      max-width: 720px;
      margin: 24px auto;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
    }
    .header {
      background: #003366;
      color: #ffffff;
      padding: 20px 24px;
      font-size: 18px;
      font-weight: 600;
    }
    .content {
      padding: 20px 24px;
      line-height: 1.8;
      font-size: 15px;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0 10px 0;
      font-size: 14px;
    }
    .table th,
    .table td {
      padding: 10px 12px;
      border: 1px solid #e5e7eb;
      text-align: right;
    }
    .table th {
      background: #f0f4f8;
      color: #374151;
      width: 40%;
    }
    .note {
      margin-top: 12px;
      color: #374151;
    }
    .footer {
      background: #f9fafb;
      color: #6b7280;
      padding: 16px 24px;
      font-size: 12px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">تقارير الإغلاق اليومي</div>
    <div class="content">
      <p>مرحباً،</p>
      <p>يرجى العلم أنه تم إنشاء التقرير التالي بنجاح:</p>
      <table class="table">
        <tr>
          <th>اسم التقرير</th>
          <td>${reportName}</td>
        </tr>
        <tr>
          <th>تاريخ الإغلاق</th>
          <td>${closeDate}</td>
        </tr>
        <tr>
          <th>عدد السجلات</th>
          <td>${safeRowCount}</td>
        </tr>
        <tr>
          <th>اسم الملف</th>
          <td>${fileName}</td>
        </tr>
      </table>
      <p class="note">التقرير مرفق مع هذا البريد الإلكتروني.</p>
    </div>
    <div class="footer">هذا بريد إلكتروني تلقائي من نظام التقارير - الأهلي فاروس</div>
  </div>
</body>
</html>`;
}
