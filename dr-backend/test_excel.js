import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import excelQueue from './utils/excelQueue.js'; // Test the actual Class

// Mock Data
const mockData = {
    _id: "REC-12345",
    registrationDateFormatted: "2026-01-23",
    timestamp: Date.now(),
    name: "Test User",
    phone: "9876543210",
    college: "Test College",
    events: [
        { name: "Debate", category: "Literary", date: "2026-02-10", time: "10:00 AM" },
        { name: "Coding", category: "Technical", date: "2026-02-11", time: "02:00 PM" }
    ],
    payment: {
        amount: 500,
        method: "UPI",
        transactionId: "TXN123456"
    },
    participantCount: 1
};

async function testExcel() {
    console.log("Testing Excel Logic...");

    try {
        // 1. Add to Queue
        await excelQueue.addToQueue(mockData);

        // 2. Add another for aggregation test
        await excelQueue.addToQueue({
            ...mockData,
            _id: "REC-67890",
            name: "Test User 2",
            events: [
                { name: "Debate", category: "Literary", date: "2026-02-10", time: "10:00 AM" }
            ],
            payment: { amount: 300, method: "CASH" }
        });

        console.log("Data added. Verifying file content...");

        const filePath = path.resolve('Inferno-registrations-26.xlsx');

        if (!fs.existsSync(filePath)) {
            throw new Error("File not created!");
        }

        const wb = XLSX.readFile(filePath);

        // Verify Sheets
        const sheets = wb.SheetNames;
        console.log("Sheets found:", sheets);
        if (!sheets.includes("Registrations") || !sheets.includes("Finance") || !sheets.includes("Participant Count")) {
            throw new Error("Missing required sheets!");
        }

        // Verify Data in Registrations
        const regs = XLSX.utils.sheet_to_json(wb.Sheets['Registrations']);
        console.log(`Registrations Count: ${regs.length}`);

        // Verify Finance
        const finance = XLSX.utils.sheet_to_json(wb.Sheets['Finance']);
        console.log("Finance Data:", finance);

        // Verify Counts
        const counts = XLSX.utils.sheet_to_json(wb.Sheets['Participant Count']);
        console.log("Participant Counts:", counts);

        console.log("TEST PASSED!");

    } catch (error) {
        console.error("TEST FAILED:", error);
    }
}

testExcel();
