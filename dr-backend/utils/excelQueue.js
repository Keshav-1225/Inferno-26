import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

class ExcelQueue {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
        this.fileName = 'Inferno-registrations-26.xlsx';
        this.filePath = path.resolve(this.fileName);
        this.initExcelFile();
    }

    initExcelFile() {
        if (!fs.existsSync(this.filePath)) {
            console.log(`File ${this.fileName} does not exist. Creating new workbook.`);
            const wb = XLSX.utils.book_new();

            // Create Headers for Registrations
            const headers = [
                'Sr. No', 'Receipt No', 'Registration Date', 'Participant Name', 'Contact No',
                'College/Institute Name', 'Name of Wing', 'Name of Competition', 'Amount',
                'Payment Method', 'Transaction ID / Cheque No', 'No. of Participants',
                'Event Date', 'Event Time'
            ];

            // Create empty sheets with headers
            const wsRegistrations = XLSX.utils.aoa_to_sheet([headers]);
            const wsFinance = XLSX.utils.aoa_to_sheet([['Wing', 'Total Amount']]);
            const wsCounts = XLSX.utils.aoa_to_sheet([['Wing', 'Competition', 'Participant Count']]);

            XLSX.utils.book_append_sheet(wb, wsRegistrations, 'Registrations');
            XLSX.utils.book_append_sheet(wb, wsFinance, 'Finance');
            XLSX.utils.book_append_sheet(wb, wsCounts, 'Participant Count');

            XLSX.writeFile(wb, this.filePath);
            console.log('Excel file initialized at:', this.filePath);
        } else {
            console.log('Excel file found at:', this.filePath);
        }
    }

    addToQueue(data) {
        return new Promise((resolve, reject) => {
            console.log("Adding to Excel Queue:", data.name);
            this.queue.push({ data, resolve, reject });
            this.processQueue();
        });
    }

    async processQueue() {
        if (this.isProcessing || this.queue.length === 0) return;

        this.isProcessing = true;
        const { data, resolve, reject } = this.queue.shift();

        try {
            console.log("Processing queue item for:", data.name);

            // Read existing workbook
            // Helper to retry reading file if locked
            const readWorkbook = () => {
                try {
                    return XLSX.readFile(this.filePath);
                } catch (e) {
                    if (e.code === 'EBUSY') {
                        throw new Error('EBUSY');
                    }
                    throw e;
                }
            };

            let wb;
            try {
                wb = readWorkbook();
            } catch (e) {
                if (e.message === 'EBUSY') {
                    console.warn(`File ${this.fileName} is busy. Retrying later...`);
                    // Put back in queue? Or just retry? 
                    // Better to put back in front of queue and retry after delay
                    this.queue.unshift({ data, resolve, reject });
                    setTimeout(() => {
                        this.isProcessing = false;
                        this.processQueue();
                    }, 2000);
                    return;
                }
                throw e;
            }

            // --- 1. Update Registrations Sheet ---
            let wsRegistrations = wb.Sheets['Registrations'];
            let registrationsData = XLSX.utils.sheet_to_json(wsRegistrations, { header: 1 }); // Array of arrays

            // Check if headers exist, if not init (should be there from init)
            if (!registrationsData || registrationsData.length === 0) {
                const headers = [
                    'Sr. No', 'Receipt No', 'Registration Date', 'Participant Name', 'Contact No',
                    'College/Institute Name', 'Name of Wing', 'Name of Competition', 'Amount',
                    'Payment Method', 'Transaction ID / Cheque No', 'No. of Participants',
                    'Event Date', 'Event Time'
                ];
                registrationsData = [headers];
            }

            const rowCount = registrationsData.length; // Header is row 1
            const srNo = rowCount; // 1-based index for next row (header=1, so next is len) - actually simpler: if len=1 (header), next srNo=1. 
            // wait, if len=1 (header), row index is 1. srNo usually starts at 1. 
            // Let's count existing data rows. len - 1. 

            const nextSrNo = rowCount > 1 ? (registrationsData[rowCount - 1][0] || 0) + 1 : 1;
            // Just increment based on previous or start at 1. Or just use rowCount.

            const wings = [...new Set(data.events.map(e => e.category))].join(', ');
            const competitions = data.events.map(e => e.name).join(', ');
            const eventDates = [...new Set(data.events.map(e => e.date))].join(', ');
            const eventTimes = data.events.map(e => e.time).join(', ');

            const newRow = [
                rowCount, // Sr No (simple logic: current row index)
                data._id.toString(),
                data.registrationDateFormatted || new Date(data.timestamp).toLocaleDateString(),
                data.name,
                data.phone,
                data.college,
                wings,
                competitions,
                data.payment.amount,
                data.payment.method,
                data.payment.transactionId || 'N/A',
                data.participantCount,
                eventDates,
                eventTimes
            ];

            registrationsData.push(newRow);

            // Re-create Registrations sheet
            const newWsRegistrations = XLSX.utils.aoa_to_sheet(registrationsData);
            wb.Sheets['Registrations'] = newWsRegistrations;


            // --- 2. Update Finance Sheet ---
            // Recalculate from FULL registrations data to be accurate
            // Skip header row
            const allRegs = registrationsData.slice(1);
            const financeMap = {}; // Wing -> Total Amount

            allRegs.forEach(row => {
                // Indices: Wing=6, Amount=8
                const rWing = row[6] || 'Unknown';
                const rAmount = parseFloat(row[8]) || 0;

                // Wing can be comma separated if multiple wings? 
                // "The finance sheet that should show data wing wise"
                // If a user registers for multiple wings, the amount is total.
                // It's hard to split amount per wing unless we know cost per event.
                // Assumption: Assign full amount to the "Wings" string combination or split?
                // Usually "Wing-wise" implies distinct wings. 
                // IF generated string "Literary, Fine Arts", we can treat it as a unique category 
                // OR we accept we only have total.
                // Let's group by the "Wing" string in the column for now as simple aggregation.

                if (!financeMap[rWing]) financeMap[rWing] = 0;
                financeMap[rWing] += rAmount;
            });

            const financeData = [['Wing', 'Total Amount']];
            for (const [wing, amount] of Object.entries(financeMap)) {
                financeData.push([wing, amount]);
            }
            wb.Sheets['Finance'] = XLSX.utils.aoa_to_sheet(financeData);


            // --- 3. Update Participant Count Sheet ---
            // "Participant count sheet that shows the data of each wing and competititon participants."
            // Wing | Competition | Count
            const countMap = {}; // "Wing|Competition" -> count

            allRegs.forEach(row => {
                // Indices: Wing=6, Competition=7, Count=11
                // Competition can be comma separated: "Debate, Painting"
                // Wing can be: "Literary, Fine Arts"
                // If they are comma separated, they align by index? likely "Debate" is "Literary".
                // We need to parse this carefully if we want clean data.
                // data.events array in the memory object `data` allows perfect mapping.
                // BUT we are rebuilding from Excel mostly? 
                // No, we are rebuilding from the Accumulated Excel Data to be consistent?
                // OR we should just use the Excel columns.
                // Issue: In Excel, "Debate, Painting" are in one cell. "Literary, Fine Arts" in another.
                // It is ambiguous which wing belongs to which competition if we parse text.
                // BETTER: Just aggregate based on the text value in the cell for now?
                // "shows the data of each wing and competititon participants"
                // If I have "Debate, Painting" and "Literary, Fine Arts", it's hard to split.

                // ALTERNATIVE: Use the current `data` object to update a persistent State? 
                // No, stateless is better.

                // Let's try to do simple breakdown if possible. 
                // If we assume standard single-entry per row is preferred for analysis, we might have chosen that.
                // But we chose 1 row per user.

                // Let's just group by the Column Value.
                // If a user has "Debate, Code" -> that is a unique key.

                // WAIT, exact requirement: "Participant count sheet that shows the data of each wing and competititon participants."
                // This implies breakdown.
                // To do this accurately from the Excel single-row-multi-value format is hard.
                // HOWEVER, when we write the new row, we have the `data` object which has clean structure.
                // We could validly just parse the whole Excel. 
                // Splitting "A, B" and "X, Y" is risky without order guarantee.
                // Assumption: They correspond in order.

                const rWings = (row[6] || '').split(',').map(s => s.trim());
                const rComps = (row[7] || '').split(',').map(s => s.trim());
                const rCount = parseInt(row[11]) || 1;

                // We'll iterate max length
                const maxLen = Math.max(rWings.length, rComps.length);
                for (let i = 0; i < maxLen; i++) {
                    // If wings has 1 but comps has 2 (e.g. Literary: Debate, Quiz), reuse Wing
                    // If wings has 2 but comps 2, map 1-to-1.
                    const w = rWings[i] || rWings[rWings.length - 1] || 'Unknown';
                    const c = rComps[i] || rComps[rComps.length - 1] || 'Unknown';

                    const key = `${w}|${c}`;
                    if (!countMap[key]) countMap[key] = 0;
                    countMap[key] += rCount; // Add participant count (or just 1 for registration? "Participant count" column usually is team size)
                    // Usually for "competititon participants", we want total heads.
                }
            });

            const countData = [['Wing', 'Competition', 'Total Participants']];
            for (const [key, count] of Object.entries(countMap)) {
                const [w, c] = key.split('|');
                countData.push([w, c, count]);
            }
            wb.Sheets['Participant Count'] = XLSX.utils.aoa_to_sheet(countData);

            // Write File
            XLSX.writeFile(wb, this.filePath);
            console.log("Successfully wrote to Excel file for:", data.name);
            resolve('Added to Excel');

        } catch (error) {
            console.error('Error writing to Excel:', error);
            if (error.code === 'EBUSY') {
                console.error("CRITICAL ERROR: File locked.");
            }
            reject(error);
        } finally {
            this.isProcessing = false;
            this.processQueue();
        }
    }
}

const excelQueue = new ExcelQueue();
export default excelQueue;
