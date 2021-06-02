module.exports.VACCINE_TYPE = {
    '1' : {VACCINE : 'COVISHIELD'},
    '2' : {VACCINE : 'COVAXIN'},
    '3' : {VACCINE : 'SPUTNIK'}
}


module.exports.VACCINE_CODE = {
    COVISHIELD : '1',
    COVAXIN : '2',
    SPUTNIK : '3'
}

module.exports.SEARCH_CODE = {
    SEARCH_BY_PIN : '1',
    SEARCH_BY_DITRICT : '2'
}


module.exports.MIN_DAYS = {
    COVISHIELD : 84,
    COVAXIN : 28,
    SPUTNIK : 21
}

module.exports.MAX_DAYS = {
    COVISHIELD : 112,
    COVAXIN : 42,
    SPUTNIK : 90
}

module.exports.SEARCH_BY = {
    '1' : {SEARCH_CRITERIA : 'Search By Pin'},
    '2' : {SEARCH_CRITERIA : 'Search By District'}
}


module.exports.CHARGE_TYPE = {
    '1' : {CHARGE_TYPE : 'Free'},
    '2' : {CHARGE_TYPE : 'Paid'}
}


module.exports.CHARGE_CODE = {
    FREE : 'Free',
    PAID : 'Paid'
}


module.exports.VACCINATION_STATUS = {
    NOT_VACCINATED : 'Not Vaccinated',
    PARTIALLY_VACCINATED : 'Partially Vaccinated',
    VACCINATED : 'Vaccinated'
}

module.exports.FREQUENCY = {
    SLOT_FINDING_FREQUENCY : 5000,
    SLOT_BOOKING_FREQUENCY : 3000
}


module.exports.SESSION = {
    token : '',
    mobile : ''
}

