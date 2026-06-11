const DATA_VARIANTS = {
    'mtn-data': [
        { id: 'mtn-1gb', name: '1GB - ₦300', price: 300, size: '1GB' },
        { id: 'mtn-2gb', name: '2GB - ₦600', price: 600, size: '2GB' },
        { id: 'mtn-5gb', name: '5GB - ₦1500', price: 1500, size: '5GB' },
        { id: 'mtn-10gb', name: '10GB - ₦3000', price: 3000, size: '10GB' }
    ],
    'glo-data': [
        { id: 'glo-1gb', name: '1GB - ₦300', price: 300, size: '1GB' },
        { id: 'glo-2gb', name: '2GB - ₦600', price: 600, size: '2GB' },
        { id: 'glo-5gb', name: '5GB - ₦1500', price: 1500, size: '5GB' }
    ],
    'airtel-data': [
        { id: 'airtel-1gb', name: '1GB - ₦300', price: 300, size: '1GB' },
        { id: 'airtel-2gb', name: '2GB - ₦600', price: 600, size: '2GB' },
        { id: 'airtel-5gb', name: '5GB - ₦1500', price: 1500, size: '5GB' }
    ],
    '9mobile-data': [
        { id: '9mobile-1gb', name: '1GB - ₦300', price: 300, size: '1GB' }
    ]
};

const TV_VARIANTS = {
    dstv: [
        { id: 'dstv-basic', name: 'Basic - ₦2,950', price: 2950, channels: '70+ Channels' },
        { id: 'dstv-compact', name: 'Compact - ₦7,700', price: 7700, channels: '120+ Channels' },
        { id: 'dstv-compact-plus', name: 'Compact Plus - ₦12,500', price: 12500, channels: '150+ Channels' },
        { id: 'dstv-premium', name: 'Premium - ₦24,500', price: 24500, channels: '180+ Channels' }
    ],
    gotv: [
        { id: 'gotv-smallie', name: 'Smallie - ₦1,300', price: 1300, channels: '30+ Channels' },
        { id: 'gotv-jinja', name: 'Jinja - ₦2,500', price: 2500, channels: '40+ Channels' },
        { id: 'gotv-max', name: 'Max - ₦4,850', price: 4850, channels: '60+ Channels' },
        { id: 'gotv-supa', name: 'Supa - ₦6,300', price: 6300, channels: '70+ Channels' }
    ],
    startimes: [
        { id: 'startimes-basic', name: 'Basic - ₦1,000', price: 1000, channels: '40+ Channels' },
        { id: 'startimes-classic', name: 'Classic - ₦2,500', price: 2500, channels: '70+ Channels' },
        { id: 'startimes-premium', name: 'Premium - ₦3,500', price: 3500, channels: '90+ Channels' }
    ]
};

module.exports = {
    DATA_VARIANTS,
    TV_VARIANTS
};