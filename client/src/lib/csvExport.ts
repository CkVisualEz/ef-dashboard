// CSV Export utility

export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  headers?: Record<keyof T, string>
) {
  if (data.length === 0) {
    alert('No data to export');
    return;
  }

  // Get all unique keys from the data
  const allKeys = new Set<string>();
  data.forEach(item => {
    Object.keys(item).forEach(key => allKeys.add(key));
  });

  const keys = Array.from(allKeys);

  // Create header row
  const headerRow = keys.map(key => {
    const header = headers?.[key as keyof T] || key;
    return `"${String(header).replace(/"/g, '""')}"`;
  }).join(',');

  // Create data rows
  const dataRows = data.map(item => {
    return keys.map(key => {
      const value = item[key];
      if (value === null || value === undefined) {
        return '""';
      }
      // Convert to string and escape quotes
      const stringValue = String(value).replace(/"/g, '""');
      // If value contains comma, newline, or quote, wrap in quotes
      if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
        return `"${stringValue}"`;
      }
      return stringValue;
    }).join(',');
  });

  // Combine header and data
  const csvContent = [headerRow, ...dataRows].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

