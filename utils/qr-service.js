const crypto = require('crypto');

/**
 * Generates a rotating token for a specific event based on the current time window.
 * The window is 30 seconds.
 */
const generateEventToken = (eventId, qrType = 'dynamic') => {
    const secret = process.env.QR_SECRET;
    
    if (qrType === 'static') {
        // Static token is just a hash of the eventId and secret, stays constant
        return crypto.createHmac('sha256', secret).update(`static:${eventId}`).digest('hex').substring(0, 16);
    }

    const window = Math.floor(Date.now() / 30000); // 30s window
    const data = `${eventId}:${window}`;
    return crypto.createHmac('sha256', secret).update(data).digest('hex').substring(0, 16);
};

/**
 * Validates a token by checking the current and previous 10s window (to allow for slight delays).
 */
const validateEventToken = (eventId, token, qrType = 'dynamic') => {
    const currentWindowToken = generateEventToken(eventId, qrType);
    
    if (token === currentWindowToken) return true;
    
    if (qrType === 'dynamic') {
        const secret = process.env.QR_SECRET;
        const prevWindow = Math.floor(Date.now() / 30000) - 1;
        const prevData = `${eventId}:${prevWindow}`;
        const prevToken = crypto.createHmac('sha256', secret).update(prevData).digest('hex').substring(0, 16);
        return token === prevToken;
    }
    
    return false;
};

module.exports = { generateEventToken, validateEventToken };
