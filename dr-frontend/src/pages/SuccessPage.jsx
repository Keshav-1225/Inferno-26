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

                // Header
                doc.setFillColor(...primaryColor);
                doc.rect(0, startY, 210, 40, 'F');

                doc.setTextColor(255, 255, 255);
                doc.setFontSize(24);
                doc.setFont("helvetica", "bold");
                doc.text("INFERNO'26", 105, startY + 20, { align: 'center' });

                doc.setFontSize(12);
                doc.setFont("helvetica", "normal");
                const title = isCopy ? "Official Registration Receipt (Copy)" : "Official Registration Receipt";
                doc.text(title, 105, startY + 30, { align: 'center' });

                // Content Start
                let yPos = startY + 50;

                // Receipt Info
                doc.setTextColor(0, 0, 0);
                doc.setFontSize(10);
                doc.text(`Receipt No: ${receiptId || _id || 'N/A'}`, 140, yPos);
                doc.text(`Date: ${registrationDateFormatted || 'N/A'}`, 140, yPos + 6);

                // Participant Details
                doc.setFontSize(14);
                doc.setFont("helvetica", "bold");
                doc.text("Participant Details", 14, yPos);
                doc.line(14, yPos + 2, 80, yPos + 2);
                yPos += 10;

                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");
                doc.text(`Name: ${name || 'N/A'}`, 14, yPos);
                doc.text(`College: ${college || 'N/A'}`, 14, yPos + 6);
                doc.text(`Phone: ${phone || 'N/A'}`, 14, yPos + 12);
                doc.text(`Email: ${email || 'N/A'}`, 14, yPos + 18);
                doc.text(`Participants: ${participantCount || 1}`, 14, yPos + 24);

                yPos += 35;

                // Events Table
                doc.setFontSize(14);
                doc.setFont("helvetica", "bold");
                doc.text("Registered Events", 14, yPos);
                yPos += 5;

                const tableColumn = ["Wing", "Competition", "Date", "Time", "Price (INR)"];
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
                    headStyles: { fillColor: primaryColor, textColor: 255 },
                    styles: { fontSize: 10 },
                    margin: { top: 10 },
                });

                // Payment Details
                const finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 15 : yPos + 20;

                doc.setFontSize(12);
                doc.setFont("helvetica", "bold");
                doc.text("Payment Summary", 14, finalY);
                doc.line(14, finalY + 2, 200, finalY + 2);

                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");

                let paymentY = finalY + 10;
                doc.text(`Total Amount Paid:`, 14, paymentY);
                doc.setFont("helvetica", "bold");
                doc.text(`INR ${payment?.amount || 0}`, 60, paymentY);

                paymentY += 6;
                doc.setFont("helvetica", "normal");
                doc.text(`Payment Method:`, 14, paymentY);
                doc.text(`${payment?.method || 'N/A'}`, 60, paymentY);

                if (payment?.method && payment?.method !== 'Cash') {
                    paymentY += 6;
                    doc.text(`Transaction ID:`, 14, paymentY);
                    doc.text(`${payment?.transactionId || 'N/A'}`, 60, paymentY);
                }
            };

            // Draw first copy
            drawReceipt(0, false);

            // Draw Separator Line
            doc.setLineDash([5, 5], 0);
            doc.setDrawColor(150);
            doc.line(10, halfHeight, 200, halfHeight);
            doc.setDrawColor(0); // reset color
            doc.setLineDash([]); // reset dash

            // Draw second copy
            drawReceipt(halfHeight, true);

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
