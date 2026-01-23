import XLSX from 'xlsx';
import fs from 'fs';
try {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([['test']]);
    XLSX.utils.book_append_sheet(wb, ws, 'Test');
    fs.writeFileSync('check_status.txt', 'METHODS_OK');
} catch (e) {
    fs.writeFileSync('check_status.txt', 'FAIL_METHODS: ' + e.message + '\n' + e.stack);
}
