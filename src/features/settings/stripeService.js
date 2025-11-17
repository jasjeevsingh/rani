/**
 * Stripe Service - Handles subscription validation and license checking
 * This service prevents the app from running without a valid subscription
 */

const Stripe = require('stripe');
const userRepository = require('../common/repositories/user');

class StripeService {
    constructor() {
        this.stripe = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the Stripe service with API key
     */
    initialize() {
        if (this.isInitialized) return;

        const secretKey = process.env.STRIPE_SECRET_KEY;
        if (!secretKey || secretKey === 'sk_test_YOUR_SECRET_KEY_HERE') {
            console.warn('[StripeService] Stripe not configured - subscription validation disabled');
            return;
        }

        this.stripe = new Stripe(secretKey, {
            apiVersion: '2024-11-20.acacia',
        });
        this.isInitialized = true;
        console.log('[StripeService] Initialized');
    }

    /**
     * Check if subscription validation is enabled
     */
    isEnabled() {
        return this.isInitialized && this.stripe !== null;
    }

    /**
     * Validate subscription status for a user
     * @param {string} uid - User ID
     * @returns {Promise<{valid: boolean, status: string, reason?: string, requiresPayment?: boolean}>}
     */
    async validateSubscription(uid) {
        if (!this.isEnabled()) {
            // If Stripe is not configured, allow access (development mode)
            return { valid: true, status: 'development', reason: 'Stripe not configured', requiresPayment: false };
        }

        try {
            const user = await userRepository.getById(uid);
            if (!user) {
                return { valid: false, status: 'no_user', reason: 'User not found', requiresPayment: false };
            }

            // If user is using personal API keys, no subscription required
            if (user.api_key_mode === 'personal') {
                return { 
                    valid: true, 
                    status: 'personal_api_key', 
                    reason: 'Using personal API keys - no subscription required',
                    requiresPayment: false
                };
            }

            const now = Date.now();

            // Check active subscription
            if (user.subscription_status === 'active') {
                // Verify with Stripe if we have a subscription ID
                if (user.subscription_id) {
                    try {
                        const subscription = await this.stripe.subscriptions.retrieve(user.subscription_id);
                        
                        if (subscription.status === 'active' || subscription.status === 'trialing') {
                            return { valid: true, status: 'active', requiresPayment: false };
                        } else {
                            // Update local status to match Stripe
                            await this.updateUserSubscriptionStatus(uid, subscription.status);
                            return { 
                                valid: false, 
                                status: subscription.status, 
                                reason: `Subscription is ${subscription.status}`,
                                requiresPayment: true
                            };
                        }
                    } catch (error) {
                        console.error('[StripeService] Error verifying subscription:', error);
                        // If we can't verify, trust local cache for now
                        return { valid: true, status: 'active', reason: 'Cached status (verification failed)', requiresPayment: false };
                    }
                }
                return { valid: true, status: 'active', requiresPayment: false };
            }

            // Check if subscription is canceled but still valid
            if (user.subscription_status === 'canceled' && user.subscription_end_date) {
                const endDate = this.getTimestamp(user.subscription_end_date);
                if (now < endDate) {
                    return { 
                        valid: true, 
                        status: 'active_until_end', 
                        endsAt: endDate,
                        daysRemaining: Math.ceil((endDate - now) / (24 * 60 * 60 * 1000)),
                        requiresPayment: false
                    };
                }
            }

            // No valid subscription - requires payment for shared API key users
            return { 
                valid: false, 
                status: user.subscription_status || 'inactive', 
                reason: 'Active subscription required to use shared API key',
                requiresPayment: true
            };

        } catch (error) {
            console.error('[StripeService] Error validating subscription:', error);
            // On error, deny access to be safe
            return { valid: false, status: 'error', reason: error.message, requiresPayment: true };
        }
    }

    /**
     * Create a Stripe customer for a user
     * @param {string} uid - User ID
     * @param {string} email - User email
     * @returns {Promise<string>} - Stripe customer ID
     */
    async createCustomer(uid, email, displayName) {
        if (!this.isEnabled()) {
            throw new Error('Stripe is not configured');
        }

        try {
            const customer = await this.stripe.customers.create({
                email,
                name: displayName,
                metadata: { uid }
            });

            // Update user record with customer ID
            await userRepository.update({ 
                uid, 
                subscriptionData: { stripe_customer_id: customer.id } 
            });

            console.log(`[StripeService] Created customer ${customer.id} for user ${uid}`);
            return customer.id;
        } catch (error) {
            console.error('[StripeService] Error creating customer:', error);
            throw error;
        }
    }

    /**
     * Create a checkout session for subscription
     * @param {string} uid - User ID
     * @returns {Promise<string>} - Checkout session URL
     */
    async createCheckoutSession(uid) {
        if (!this.isEnabled()) {
            throw new Error('Stripe is not configured');
        }

        try {
            const user = await userRepository.getById(uid);
            if (!user) {
                throw new Error('User not found');
            }

            // Get or create Stripe customer
            let customerId = user.stripe_customer_id;
            if (!customerId) {
                customerId = await this.createCustomer(uid, user.email, user.display_name);
            }

            const priceId = process.env.STRIPE_PRICE_ID;
            if (!priceId || priceId === 'price_YOUR_PRICE_ID_HERE') {
                throw new Error('Stripe price ID not configured');
            }

            const session = await this.stripe.checkout.sessions.create({
                customer: customerId,
                mode: 'subscription',
                line_items: [
                    {
                        price: priceId,
                        quantity: 1,
                    },
                ],
                success_url: 'rani://subscription/success',
                cancel_url: 'rani://subscription/cancel',
                metadata: { uid }
            });

            console.log(`[StripeService] Created checkout session for user ${uid}`);
            return session.url;
        } catch (error) {
            console.error('[StripeService] Error creating checkout session:', error);
            throw error;
        }
    }

    /**
     * Handle subscription webhook events from Stripe
     * @param {object} event - Stripe webhook event
     */
    async handleWebhook(event) {
        console.log(`[StripeService] Processing webhook: ${event.type}`);

        try {
            switch (event.type) {
                case 'customer.subscription.created':
                case 'customer.subscription.updated':
                    await this.handleSubscriptionUpdate(event.data.object);
                    break;

                case 'customer.subscription.deleted':
                    await this.handleSubscriptionDeleted(event.data.object);
                    break;

                case 'invoice.payment_succeeded':
                    await this.handlePaymentSucceeded(event.data.object);
                    break;

                case 'invoice.payment_failed':
                    await this.handlePaymentFailed(event.data.object);
                    break;

                default:
                    console.log(`[StripeService] Unhandled event type: ${event.type}`);
            }
        } catch (error) {
            console.error('[StripeService] Error handling webhook:', error);
            throw error;
        }
    }

    /**
     * Update user subscription status from Stripe subscription object
     */
    async handleSubscriptionUpdate(subscription) {
        const uid = subscription.metadata.uid;
        if (!uid) {
            console.error('[StripeService] No UID in subscription metadata');
            return;
        }

        const updateData = {
            subscription_id: subscription.id,
            stripe_customer_id: subscription.customer,
            subscription_status: subscription.status,
            subscription_start_date: subscription.current_period_start * 1000,
            subscription_end_date: subscription.current_period_end * 1000,
        };

        if (subscription.cancel_at) {
            updateData.subscription_cancel_at = subscription.cancel_at * 1000;
            updateData.subscription_status = 'canceled';
        }

        await userRepository.update({ uid, subscriptionData: updateData });
        console.log(`[StripeService] Updated subscription for user ${uid}: ${subscription.status}`);
    }

    /**
     * Handle subscription deletion
     */
    async handleSubscriptionDeleted(subscription) {
        const uid = subscription.metadata.uid;
        if (!uid) {
            console.error('[StripeService] No UID in subscription metadata');
            return;
        }

        await userRepository.update({ 
            uid, 
            subscriptionData: { 
                subscription_status: 'canceled',
                subscription_end_date: Date.now()
            } 
        });
        console.log(`[StripeService] Subscription deleted for user ${uid}`);
    }

    /**
     * Handle successful payment
     */
    async handlePaymentSucceeded(invoice) {
        const customerId = invoice.customer;
        const subscriptionId = invoice.subscription;

        if (subscriptionId) {
            const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
            await this.handleSubscriptionUpdate(subscription);
        }

        console.log(`[StripeService] Payment succeeded for customer ${customerId}`);
    }

    /**
     * Handle failed payment
     */
    async handlePaymentFailed(invoice) {
        const customerId = invoice.customer;
        console.log(`[StripeService] Payment failed for customer ${customerId}`);
        // Could send notification to user here
    }

    /**
     * Update user subscription status in database
     */
    async updateUserSubscriptionStatus(uid, status) {
        await userRepository.update({ 
            uid, 
            subscriptionData: { subscription_status: status } 
        });
    }

    /**
     * Helper to convert Firestore Timestamp or Unix timestamp to milliseconds
     */
    getTimestamp(value) {
        if (!value) return 0;
        if (typeof value === 'number') return value;
        if (value.toMillis) return value.toMillis();
        if (value.seconds) return value.seconds * 1000;
        return 0;
    }
}

const stripeService = new StripeService();
module.exports = stripeService;
