// import mongoose from "mongoose";

// const registrationSchema = new mongoose.Schema({
//     name: {
//         type: String,
//         required: true,
//         trim: true
//     },
//     email: {
//         type: String, // Keeping email for communication, though not in exact user list
//         required: true,
//         trim: true, // lowercase handled by setter usually, but fine here
//         lowercase: true
//     },
//     phone: {
//         type: String,
//         required: true,
//         trim: true
//     },
//     college: {
//         type: String,
//         required: true,
//         trim: true
//     },
//     events: [{
//         name: String,
//         date: String,
//         time: String,
//         category: String, // 'Wing'
//         price: Number
//     }],
//     payment: {
//         amount: { type: Number, required: true },
//         method: { type: String, required: true }, // Cash, UPI, etc.
//         transactionId: { type: String, default: "" }
//     },
//     participantCount: {
//         type: Number,
//         required: true,
//         default: 1
//     },
//     timestamp: {
//         type: Date,
//         default: Date.now
//     },
//     registrationDateFormatted: {
//         type: String // Stores the specific formatted date sent from client
//     }

// });

// const Registration = mongoose.model("Registration", registrationSchema);

// export default Registration;


import mongoose from "mongoose";

const registrationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    college: {
        type: String,
        required: true,
        trim: true
    },
    events: [{
        name: String,
        date: String,
        time: String,
        category: String,
        price: Number
    }],
    payment: {
        amount: { type: Number, required: true },
        method: { type: String, required: true },
        transactionId: { type: String, default: "" }
    },
    participantCount: {
        type: Number,
        required: true,
        default: 1
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    registrationDateFormatted: {
        type: String
    },

    // 👇 STEP 3: ADD THIS BLOCK HERE 👇
    receiptId: {
        type: String,
        unique: true,   // Ensures every ID (INF-1, INF-2) is unique
        required: true  // Forces the database to always have this ID
    }
    // 👆 END OF NEW CODE 👆

});

const Registration = mongoose.model("Registration", registrationSchema);

export default Registration;