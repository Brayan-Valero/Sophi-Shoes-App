/**
 * Utility to export data to CSV and trigger a download in the browser.
 */
export function exportToCSV(data: any[], filename: string, headers?: string[]) {
    if (!data || !data.length) return;

    const columnHeaders = headers || Object.keys(data[0]);
    const csvContent = [
        columnHeaders.join(','), // Header row
        ...data.map(row =>
            columnHeaders.map(header => {
                const value = row[header] === null || row[header] === undefined ? '' : row[header];
                // Escape quotes and wrap in quotes if contains comma
                const stringValue = String(value).replace(/"/g, '""');
                return stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')
                    ? `"${stringValue}"`
                    : stringValue;
            }).join(',')
        )
    ].join('\n');

    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
