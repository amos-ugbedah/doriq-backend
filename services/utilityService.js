const { DATA_VARIANTS, TV_VARIANTS } = require('../config/constants');

const getUtilitiesForCountry = (countryCode) => {
    const baseUtilities = {
        airtime: [
            { id: 'mtn-airtime', name: 'MTN Airtime', type: 'airtime', provider: 'MTN', isAirtime: true },
            { id: 'glo-airtime', name: 'Glo Airtime', type: 'airtime', provider: 'Glo', isAirtime: true },
            { id: 'airtel-airtime', name: 'Airtel Airtime', type: 'airtime', provider: 'Airtel', isAirtime: true },
            { id: '9mobile-airtime', name: '9mobile Airtime', type: 'airtime', provider: '9mobile', isAirtime: true }
        ],
        data: [
            { id: 'mtn-data', name: 'MTN Data', type: 'data', provider: 'MTN', icon: '📶' },
            { id: 'glo-data', name: 'Glo Data', type: 'data', provider: 'Glo', icon: '📶' },
            { id: 'airtel-data', name: 'Airtel Data', type: 'data', provider: 'Airtel', icon: '📶' },
            { id: '9mobile-data', name: '9mobile Data', type: 'data', provider: '9mobile', icon: '📶' }
        ],
        electricity: [
            { id: 'ikeja-electric', name: 'Ikeja Electric', type: 'electricity', provider: 'IKEDC', billerCode: 'IKEDC' },
            { id: 'eko-electric', name: 'Eko Electric', type: 'electricity', provider: 'EKEDC', billerCode: 'EKEDC' },
            { id: 'abuja-electric', name: 'Abuja Electric', type: 'electricity', provider: 'AEDC', billerCode: 'AEDC' },
            { id: 'phcn', name: 'PHCN', type: 'electricity', provider: 'PHCN', billerCode: 'PHCN' }
        ],
        tv: [
            { id: 'dstv', name: 'DStv', type: 'tv', provider: 'DStv', icon: '📺' },
            { id: 'gotv', name: 'GOtv', type: 'tv', provider: 'GOtv', icon: '📺' },
            { id: 'startimes', name: 'StarTimes', type: 'tv', provider: 'StarTimes', icon: '📺' }
        ]
    };
    
    if (countryCode === 'NG') return baseUtilities;
    
    return {
        airtime: [{ id: 'global-airtime', name: 'Airtime', type: 'airtime', isAirtime: true }],
        data: [{ id: 'global-data', name: 'Data Bundle', type: 'data' }],
        electricity: [{ id: 'global-electricity', name: 'Electricity Bill', type: 'electricity' }],
        tv: [{ id: 'global-tv', name: 'TV Subscription', type: 'tv' }]
    };
};

module.exports = { getUtilitiesForCountry, DATA_VARIANTS, TV_VARIANTS };