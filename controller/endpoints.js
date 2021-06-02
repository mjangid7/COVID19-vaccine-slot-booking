module.exports = {
    GET_OTP : 'https://cdn-api.co-vin.in/api/v2/auth/generateMobileOTP',
    VALIDATE_OTP : 'https://cdn-api.co-vin.in/api/v2/auth/validateMobileOtp',
    GET_BENEFICIARIES : 'https://cdn-api.co-vin.in/api/v2/appointment/beneficiaries',
    GET_STATES : 'https://cdn-api.co-vin.in/api/v2/admin/location/states',
    GET_DISTRICTS : 'https://cdn-api.co-vin.in/api/v2/admin/location/districts/%s',
    GET_CENTER_BY_PINCODE : 'https://cdn-api.co-vin.in/api/v2/appointment/sessions/calendarByPin',
    GET_CENTER_BY_DISTRICT : 'https://cdn-api.co-vin.in/api/v2/appointment/sessions/calendarByDistrict',
    GET_CAPTCHA : 'https://cdn-api.co-vin.in/api/v2/auth/getRecaptcha',
    BOOK_APPOINTMENT : 'https://cdn-api.co-vin.in/api/v2/appointment/schedule'
};