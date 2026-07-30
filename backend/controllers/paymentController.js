const Razorpay = require('razorpay');
const crypto = require('crypto');
const Auction = require('../models/Auction');
const User = require('../models/User');
const { Timeline, TIMELINE_EVENTS } = require('../models/Timeline');

const getRazorpayInstance = () => {
    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
};

const createOrder = async (req, res) => {
    try {
        const { auctionId } = req.body;
        
        const auction = await Auction.findById(auctionId);
        if (!auction) {
            return res.status(404).json({ message: 'Auction not found' });
        }

        if (auction.status !== 'completed' && auction.status !== 'paid') {
            return res.status(400).json({ message: 'Auction is not completed yet.' });
        }

        if (String(auction.highestBidder) !== String(req.user._id)) {
            return res.status(403).json({ message: 'You are not the winner of this auction.' });
        }

        let amount = auction.currentHighestBid * 100; // Razorpay expects paise

        // Razorpay Test Mode has a strict upper limit for order amounts (usually 5 Lakhs).
        // For testing purposes, if the bid exceeds 5 Lakhs, cap the payment order amount so the gateway still works.
        if (amount > 50000000) {
            amount = 50000000; 
        }

        const options = {
            amount: amount,
            currency: 'INR',
            receipt: `receipt_auction_${auction._id}`,
        };

        const razorpay = getRazorpayInstance();
        const order = await razorpay.orders.create(options);

        auction.payment = {
            winner: req.user._id,
            finalBid: auction.currentHighestBid, // Keep actual bid for DB records
            status: 'pending',
            gatewayOrderId: order.id,
            gateway: 'razorpay'
        };
        await auction.save();

        await Timeline.create({
            auction: auctionId,
            actor: req.user._id,
            event: TIMELINE_EVENTS.PAYMENT_INITIATED,
            occurredAt: new Date(),
            metadata: { gatewayOrderId: order.id, amount }
        });

        res.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency
        });

    } catch (error) {
        console.error('Create Order Error:', error);
        // Extract detailed Razorpay error if available
        const errorMsg = error.error?.description || error.message || 'Error creating payment order.';
        res.status(500).json({ message: errorMsg });
    }
};

const verifyPayment = async (req, res) => {
    try {
        const { auctionId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        const auction = await Auction.findById(auctionId);
        if (!auction || !auction.payment) {
            return res.status(404).json({ message: 'Auction or payment record not found.' });
        }

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature === razorpay_signature) {
            auction.payment.status = 'successful';
            auction.payment.gatewayPaymentId = razorpay_payment_id;
            auction.payment.paidAt = new Date();
            auction.status = 'paid';
            await auction.save();

            // Increment winner's totalAmountSpent
            await User.findByIdAndUpdate(req.user._id, {
                $inc: { 'stats.totalAmountSpent': auction.currentHighestBid }
            });

            await Timeline.create({
                auction: auctionId,
                actor: req.user._id,
                event: TIMELINE_EVENTS.PAYMENT_SUCCESS,
                occurredAt: new Date(),
                metadata: { gatewayPaymentId: razorpay_payment_id }
            });

            res.json({ message: 'Payment verified successfully.' });
        } else {
            auction.payment.status = 'failed';
            await auction.save();
            
            await Timeline.create({
                auction: auctionId,
                actor: req.user._id,
                event: TIMELINE_EVENTS.PAYMENT_FAILED,
                occurredAt: new Date(),
                metadata: { reason: 'Signature verification failed' }
            });
            
            res.status(400).json({ message: 'Payment signature verification failed.' });
        }
    } catch (error) {
        console.error('Verify Payment Error:', error);
        res.status(500).json({ message: 'Error verifying payment.' });
    }
};

module.exports = { createOrder, verifyPayment };
