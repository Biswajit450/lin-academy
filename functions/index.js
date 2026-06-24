const functions = require("firebase-functions");
// 🚨 MAGIC UPGRADE: Importing Google's modern V2 Engine for secure checkouts
const { onCall, HttpsError } = require("firebase-functions/v2/https"); 
const admin = require("firebase-admin");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const cors = require("cors")({ origin: true });

// 1. Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// 🚨 RAZORPAY KEYS (Aapki Live Keys Secure hain)
const RAZORPAY_KEY_ID = "rzp_live_T5Sz0KnOfFMwzp";
const RAZORPAY_KEY_SECRET = "EgvyyzwkbSObM67JVVithLJ5";
const WEBHOOK_SECRET = "lin_academy_super_secret_123"; 

// Initialize Razorpay Instance
const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

// ============================================================================
// API 1: CREATE ORDER (App bulayegi jab bachha 'Enroll Now' dabayega)
// ============================================================================
// 🚨 V2 UPGRADE: Changed from functions.https.onCall to modern onCall(request)
exports.createOrder = onCall(async (request) => {
    // Check if user is logged in using the modern V2 'request.auth'
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Bhai, pehle login karo!");
    }
    
    const userId = request.auth.uid;
    const courseTitle = request.data.courseTitle; // V2 uses request.data

    if (!courseTitle) {
        throw new HttpsError("invalid-argument", "Course ka naam missing hai.");
    }

    try {
        // 1. Securely fetch course price & validity from Firestore
        const courseSnap = await db.collection("deployed_courses").doc(courseTitle).get();
        if (!courseSnap.exists) {
            throw new HttpsError("not-found", "Course nahi mila.");
        }
        
        const courseData = courseSnap.data();
        const priceInRupees = courseData.price || 0;
        const validityDays = courseData.validity || 0;

        if (priceInRupees <= 0) {
             throw new HttpsError("failed-precondition", "Free course hai ya price theek nahi hai.");
        }

        // 2. Tell Razorpay to create a fresh Order
        const options = {
            amount: priceInRupees * 100, // Razorpay takes amount in Paise (₹1 = 100p)
            currency: "INR",
            receipt: `rcpt_${userId.substring(0, 5)}_${Date.now()}`,
            // NOTES are the magic trick! We send these to Razorpay, and they send it back in Webhook
            notes: {
                userId: userId,
                courseTitle: courseTitle,
                validity: validityDays
            }
        };

        const order = await razorpay.orders.create(options);
        
        // Send Order ID back to Frontend App
        return {
            id: order.id,
            amount: order.amount,
            currency: order.currency
        };

    } catch (error) {
        console.error("Order Creation Error:", error);
        throw new HttpsError("internal", error.message);
    }
});

// ============================================================================
// API 2: RAZORPAY WEBHOOK (Automated Cashier - Sunta rahega background mein)
// ============================================================================
exports.razorpayWebhook = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        // Razorpay always sends data via POST method
        if (req.method !== "POST") {
            return res.status(405).send("Method Not Allowed");
        }

        const signature = req.headers["x-razorpay-signature"];
        const body = req.rawBody; // Raw payload needed for signature check

        try {
            // 1. The Bouncer Check: Verify Razorpay Signature
            const expectedSignature = crypto
                .createHmac("sha256", WEBHOOK_SECRET)
                .update(body)
                .digest("hex");

            if (expectedSignature !== signature) {
                console.error("🚨 HACKER ALERT! Invalid Signature.");
                return res.status(400).send("Invalid Signature");
            }

            // 2. Parse the verified data
            const payload = req.body;

            // We only take action if payment was successfully captured
            if (payload.event === "payment.captured") {
                const payment = payload.payload.payment.entity;
                const notes = payment.notes;

                const userId = notes.userId;
                const courseTitle = notes.courseTitle;
                const validityDays = parseInt(notes.validity) || 0;

                if (!userId || !courseTitle) {
                    console.error("Missing mapping info", notes);
                    return res.status(200).send("Skipped - No metadata.");
                }

                // 3. Unlock Magic: Add to User's Database
                const userRef = db.collection("users").doc(userId);

                // Add to array for immediate UI unlock
                await userRef.set({
                    unlocked_courses: admin.firestore.FieldValue.arrayUnion(courseTitle)
                }, { merge: true });

                // 4. Time Machine: Calculate and save Expiry Date
                if (validityDays > 0) {
                    const expiresAt = new Date();
                    expiresAt.setDate(expiresAt.getDate() + validityDays);

                    await userRef.set({
                        subscriptions: {
                            [courseTitle]: {
                                unlockedAt: admin.firestore.FieldValue.serverTimestamp(),
                                expiresAt: expiresAt.toISOString(),
                                status: "active"
                            }
                        }
                    }, { merge: true });
                }

                console.log(`✅ BINGO! Unlocked "${courseTitle}" for user ${userId}`);
            }

            // Always respond with 200 OK so Razorpay knows we got the message
            res.status(200).send("Webhook Processed");

        } catch (error) {
            console.error("Webhook Error:", error);
            res.status(500).send("Internal Server Error");
        }
    });
});