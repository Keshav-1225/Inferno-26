import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import socket from "../socket";

export default function SuccessPage() {
    const location = useLocation();
    const navigate = useNavigate();
    // Safely access data, defaulting to empty object/string if accessed directly
    const registrationData = location.state?.data || {};
    const { _id, receiptId, name, college, email, phone, events, registrationDateFormatted, payment, participantCount } = registrationData;



    const generateReceipt = () => {
        try {

            const doc = new jsPDF();
            const pageHeight = doc.internal.pageSize.height;
            const halfHeight = pageHeight / 2;

            // Helper to draw a single receipt receipt
            const drawReceipt = (startY, isCopy) => {
                // Colors
                const primaryColor = [255, 69, 0]; // #ff4500

                // Header (Reduced height 40 -> 30)
                doc.setFillColor(...primaryColor);
                doc.rect(0, startY, 210, 30, 'F');

                doc.setTextColor(255, 255, 255);
                doc.setFontSize(20); // Reduced 24 -> 20
                doc.setFont("helvetica", "bold");
                doc.text("INFERNO'26", 105, startY + 15, { align: 'center' }); // Adjusted Y

                doc.setFontSize(10); // Reduced 12 -> 10
                doc.setFont("helvetica", "normal");
                const title = isCopy ? "Official Registration Receipt (Copy)" : "Official Registration Receipt";
                doc.text(title, 105, startY + 24, { align: 'center' }); // Adjusted Y

                // Content Start (Reduced gap 50 -> 36)
                let yPos = startY + 36;

                // Receipt Info
                doc.setTextColor(0, 0, 0);
                doc.setFontSize(9); // Reduced 10 -> 9
                doc.text(`Receipt No: ${receiptId || _id || 'N/A'}`, 140, yPos);
                doc.text(`Date: ${registrationDateFormatted || 'N/A'}`, 140, yPos + 5); // Spacing 6 -> 5

                // Participant Details
                doc.setFontSize(12); // Reduced 14 -> 12
                doc.setFont("helvetica", "bold");
                doc.text("Participant Details", 14, yPos);
                doc.line(14, yPos + 2, 80, yPos + 2);
                yPos += 8; // Reduced 10 -> 8

                doc.setFontSize(9); // Reduced 10 -> 9
                doc.setFont("helvetica", "normal");
                doc.text(`Name: ${name || 'N/A'}`, 14, yPos);
                doc.text(`College: ${college || 'N/A'}`, 14, yPos + 5);
                doc.text(`Phone: ${phone || 'N/A'}`, 14, yPos + 10);
                doc.text(`Email: ${email || 'N/A'}`, 14, yPos + 15);
                doc.text(`Participants: ${participantCount || 1}`, 14, yPos + 20);

                yPos += 28; // Reduced 35 -> 28

                // Events Table
                doc.setFontSize(12); // Reduced 14 -> 12
                doc.setFont("helvetica", "bold");
                doc.text("Registered Events", 14, yPos);
                yPos += 4; // Reduced 5 -> 4

                const tableColumn = ["Wing", "Competition", "Date", "Time", "Price"];
                const tableRows = [];

                if (events && Array.isArray(events) && events.length > 0) {
                    events.forEach(event => {
                        const eventData = [
                            event.category || "N/A",
                            event.name || "N/A",
                            event.date || "N/A",
                            event.time || "N/A",
                            event.price !== undefined ? `${event.price}` : "0",
                        ];
                        tableRows.push(eventData);
                    });
                } else {
                    tableRows.push(["-", "No events found", "-", "-", "0"]);
                }

                // Call autoTable directly
                autoTable(doc, {
                    startY: yPos,
                    head: [tableColumn],
                    body: tableRows,
                    theme: 'grid',
                    headStyles: { fillColor: primaryColor, textColor: 255, fontSize: 9 }, // Reduced font
                    styles: { fontSize: 8, cellPadding: 2 }, // Reduced font & padding
                    margin: { top: 10, left: 14, right: 14 },
                });

                // Payment Details
                // Use a tighter gap after table
                const finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 10 : yPos + 15;

                doc.setFontSize(11); // Reduced 12 -> 11
                doc.setFont("helvetica", "bold");
                doc.text("Payment Summary", 14, finalY);
                doc.line(14, finalY + 2, 200, finalY + 2);

                doc.setFontSize(9); // Reduced 10 -> 9
                doc.setFont("helvetica", "normal");

                let paymentY = finalY + 8; // Reduced 10 -> 8
                doc.text(`Total Amount Paid:`, 14, paymentY);
                doc.setFont("helvetica", "bold");
                doc.text(`INR ${payment?.amount || 0}`, 50, paymentY); // Adjusted X

                paymentY += 5; // Reduced 6 -> 5
                doc.setFont("helvetica", "normal");
                doc.text(`Payment Method:`, 14, paymentY);
                doc.text(`${payment?.method || 'N/A'}`, 50, paymentY);

                if (payment?.method && payment?.method !== 'Cash') {
                    paymentY += 5;
                    doc.text(`Transaction ID:`, 14, paymentY);
                    doc.text(`${payment?.transactionId || 'N/A'}`, 50, paymentY);
                }
            };

            // Draw first copy
            drawReceipt(5, false); // Start slightly lower for margins? No, start at 5 to save space top

            // Draw Separator Line
            doc.setLineDash([5, 5], 0);
            doc.setDrawColor(150);
            doc.line(10, halfHeight, 200, halfHeight);
            doc.setDrawColor(0); // reset color
            doc.setLineDash([]); // reset dash

            // Draw second copy
            drawReceipt(halfHeight + 5, true);

            const safeName = (name || 'receipt').replace(/[^a-z0-9]/gi, '_').toLowerCase();
            doc.save(`${receiptId || safeName}_receipt.pdf`);



        } catch (err) {
            console.error("PDF Generation Error:", err);
            alert("Failed to generate receipt: " + err.message);
        }
    };

    return (
        <div className="page-container" style={{ textAlign: 'center' }}>
            <div className="card">
                <div style={{ marginBottom: '2rem' }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        background: '#00ff66',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1rem auto',
                        fontSize: '40px',
                        boxShadow: '0 0 20px rgba(0,255,102,0.4)',
                        color: 'black'
                    }}>
                        ✓
                    </div>
                    <h2>Registration Successful!</h2>
                    <p style={{ color: '#aaa', marginTop: '10px' }}>
                        Welcome, <strong>{name || 'Participant'}</strong>.
                    </p>
                </div>



                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <button
                        onClick={generateReceipt}
                        style={{ background: '#333', border: '1px solid #555' }}
                    >
                        📄 Download Detailed Receipt
                    </button>
                    <button onClick={() => navigate('/')}>Register Another</button>
                </div>
            </div>
        </div>
    );
}
