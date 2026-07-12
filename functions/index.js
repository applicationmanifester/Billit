const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Stripe Configuration should be set via: firebase functions:config:set stripe.secret=...
// For phase 3 development, replace 'sk_test_...' with your actual Stripe Secret Key.
const stripeSecret = functions.config().stripe?.secret || 'sk_test_placeholder';
const stripe = require('stripe')(stripeSecret);

admin.initializeApp();

/**
 * STRIPE CHECKOUT (Phase 3)
 * Securely creates a Stripe Checkout session for a specific user and plan.
 */
exports.createCheckoutSession = functions.https.onCall(async (data, context) => {
    // 1. Verify Authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    }

    const { planId, successUrl, cancelUrl } = data;
    const uid = context.auth.uid;

    if (!['pro', 'business'].includes(planId)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid plan ID.');
    }

    // 2. Fetch or Define Prices (Stripe Price IDs)
    // mapping of plan -> Stripe Price ID
    const prices = {
        'pro': functions.config().stripe?.price_pro || 'price_pro_placeholder',
        'business': functions.config().stripe?.price_business || 'price_business_placeholder'
    };

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price: prices[planId],
                quantity: 1,
            }],
            mode: 'subscription',
            subscription_data: {
                metadata: {
                    userId: uid,
                    planId: planId
                }
            },
            success_url: successUrl,
            cancel_url: cancelUrl,
            client_reference_id: uid, // very important for webhooks
            metadata: {
                userId: uid,
                planId: planId
            }
        });

        return { url: session.url };
    } catch (err) {
        console.error('Stripe Session Error:', err);
        throw new functions.https.HttpsError('internal', err.message);
    }
});

/**
 * STRIPE WEBHOOK LISTENER
 * Handles subscription events and updates user tier documents automatically.
 */
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
    const signature = req.headers['stripe-signature'];
    const webhookSecret = functions.config().stripe?.webhook_secret;

    let event;
    try {
        if (webhookSecret) {
            event = stripe.webhooks.constructEvent(req.rawBody, signature, webhookSecret);
        } else {
            // ONLY for development/local testing. Fallback to direct body if secret is missing or we are in dev.
            event = req.body;
        }
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle checkout session completion
    try {
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const uid = session.client_reference_id || (session.metadata ? session.metadata.userId : null);
            const planId = session.metadata ? session.metadata.planId : null;

            if (uid && planId) {
                await admin.firestore().collection('users').doc(uid).set({
                    plan: planId,
                    stripeCustomerId: session.customer,
                    billingPeriodStart: admin.firestore.Timestamp.now().toDate().toISOString(),
                    invoicesGenerated: 0,
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                // Log the audit event
                await admin.firestore().collection('billing_history').add({
                    userId: uid,
                    type: 'upgrade',
                    plan: planId,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    details: 'Successful Stripe Checkout'
                });

                console.log(`User ${uid} successfully upgraded to ${planId}`);
            }
        } else if (event.type === 'customer.subscription.deleted') {
            const subscription = event.data.object;
            const uid = subscription.metadata ? subscription.metadata.userId : null;
            if (uid) {
                await admin.firestore().collection('users').doc(uid).set({
                    plan: 'free',
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                // Log the audit event
                await admin.firestore().collection('billing_history').add({
                    userId: uid,
                    type: 'subscription_cancelled',
                    plan: 'free',
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    details: 'Subscription deleted in Stripe'
                });

                console.log(`User ${uid} subscription deleted, reverted to Free.`);
            }
        }
    } catch (dbErr) {
        console.error('Firestore Update Error in Webhook:', dbErr);
        // Important: Return 500 so Stripe retries the webhook
        return res.status(500).send('Database Error');
    }

    res.status(200).json({ received: true });
});

/**
 * USAGE RESET JOB (Placeholder for Phase 4)
 * Optional: Automatically reset everyone's counters on a daily CRON job 
 * to ensure absolute consistency even if they don't open the app.
 */
exports.autoResetUsage = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const usersRef = admin.firestore().collection('users');
    // We look for users whose billingPeriodStart is older than 30 days
    const snapshot = await usersRef.where('billingPeriodStart', '<', thirtyDaysAgo.toISOString()).get();
    
    if (snapshot.empty) {
        console.log('No users due for usage reset.');
        return null;
    }

    const batch = admin.firestore().batch();
    snapshot.forEach(doc => {
        batch.update(doc.ref, {
            invoicesGenerated: 0,
            billingPeriodStart: now.toDate().toISOString(),
            lastUsageReset: admin.firestore.FieldValue.serverTimestamp()
        });
    });

    await batch.commit();
    console.log(`Reset usage for ${snapshot.size} users.`);
    return null;
});

/**
 * STRIPE CUSTOMER PORTAL
 * Creates a link to the Stripe Customer Portal where users can manage their subscription.
 */
exports.createPortalLink = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    
    try {
        const userDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
        const userData = userDoc.data();
        
        // We'll catch situations where no customer ID exists yet
        let customerId = userData?.stripeCustomerId;
        
        if (!customerId) {
            // If they are on a paid plan but no ID (legacy or sync error), we can find them by email
            const customers = await stripe.customers.list({ email: context.auth.token.email, limit: 1 });
            if (customers.data.length > 0) {
                customerId = customers.data[0].id;
                // Store it for next time
                await userDoc.ref.update({ stripeCustomerId: customerId });
            } else {
                throw new functions.https.HttpsError('not-found', 'No Stripe customer found. Please subscribe first.');
            }
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: data.returnUrl || 'https://billit-app.web.app', // Default production URL if returnUrl missing
        });

        return { url: session.url };
    } catch (err) {
        console.error('Portal Link Error:', err);
        throw new functions.https.HttpsError('internal', err.message);
    }
});

/**
 * PING (Testing)
 */
exports.ping = functions.https.onCall(() => {
    return { status: "Online", timestamp: new Date().toISOString() };
});
