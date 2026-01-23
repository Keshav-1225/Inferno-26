import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import connectDB from "./config/db.js";
import dotenv from "dotenv";
import Registration from "./models/Registration.js";
import excelQueue from "./utils/excelQueue.js";
import Counter from "./models/Counter.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allow all for local network testing easily
        methods: ["GET", "POST"]
    }
});

const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to database
connectDB();

// Socket.io connection
io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    // Send current count on connection (LOG ONLY)
    Registration.countDocuments().then(count => {
        console.log("Current Participant Count:", count);
        // socket.emit("counter_update", count); // HIDDEN FROM CLIENT
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });
});

app.get("/", (req, res) => {
    res.send("Inferno'26 Backend Running");
});

app.get("/health", (req, res) => {
    res.send("Server healthy");
});

// Registration Endpoint
// app.post("/api/register", async (req, res) => {
//     try {
//         const { name, email, phone, college, events, payment, participantCount, registrationDateFormatted } = req.body;

//         // 1. Save to MongoDB
//         const newRegistration = new Registration({
//             name,
//             email,
//             phone,
//             college,
//             events,
//             payment,
//             participantCount,
//             registrationDateFormatted
//         });

//         const savedRegistration = await newRegistration.save();

//         // ----------------------------------------------------
//         // THE FIX IS HERE: Convert to plain object
//         // ----------------------------------------------------
//         const plainData = savedRegistration.toObject();

//         // 2. Add to Excel Queue
//         // Pass 'plainData' instead of 'savedRegistration'
//         excelQueue.addToQueue(plainData).catch(err => console.error("Excel queue error:", err));

//         // 3. Update Live Counter via Socket
//         const count = await Registration.countDocuments();
//         console.log(`New Registration, Total Participants: ${count}`);

//         // It is safe to emit the full Mongoose object to sockets, but plainData is lighter
//         io.emit("new_registration", plainData); 

//         res.status(201).json({ message: "Registration successful", data: plainData });

//     } catch (error) {
//         // ... existing error handling ...
//     }
// });
app.post("/api/register", async (req, res) => {
    try {
        const { name, email, phone, college, events, payment, participantCount, registrationDateFormatted } = req.body;

        // --- NEW CODE STARTS HERE ---

        // 1. ATOMIC COUNTER LOGIC
        // This ensures every user gets a unique number (e.g., INF-21, INF-22)
        // even if they register at the exact same millisecond.
        const counter = await Counter.findOneAndUpdate(
            { id: "registrationId" },   // The name of the counter
            { $inc: { seq: 1 } },       // Increment sequence by +1
            { new: true, upsert: true } // Create if it doesn't exist
        );

        // Create the string ID (e.g., "INF-50")
        const sequentialId = `INF-${counter.seq}`;

        // --- NEW CODE ENDS HERE ---


        // 2. Save to MongoDB
        const newRegistration = new Registration({
            name,
            email,
            phone,
            college,
            events,
            payment,
            participantCount,
            registrationDateFormatted,
            receiptId: sequentialId  // <--- ADD THIS LINE (Save the ID)
        });

        const savedRegistration = await newRegistration.save();


        // 3. Convert to plain object for Excel (Your existing fix)
        const plainData = savedRegistration.toObject();

        // 4. Add to Excel Queue
        excelQueue.addToQueue(plainData).catch(err => console.error("Excel queue error:", err));

        // 5. Update Live Counter via Socket
        const count = await Registration.countDocuments();
        console.log(`New Registration! Total Participants: ${count}`);

        io.emit("new_registration", plainData);

        res.status(201).json({ message: "Registration successful", data: plainData });

    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
});


httpServer.listen(port, () => {
    console.log(`Server working on: http://localhost:${port}`);
});
