const constants = require('./constants');

exports.getAge = function(birth_year){
    return new Date().getFullYear() - parseInt(birth_year);
}


exports.getGender = function(gender){
    if(gender == 'Male') return 'M';
    else if(gender == 'Female') return 'F';
    else return 'O';
}

exports.getSearch = (preference) => {
    return constants.SEARCH_BY[preference.search]['SEARCH_CRITERIA'];
}

exports.getVaccine = (preference) => {
    return constants.VACCINE_TYPE[preference.vaccine]['VACCINE'];
}

exports.getPincode = (preference) => {
    return preference.pincode;
}

exports.getName = (preference) => {
    return preference.name;
}

exports.getChargeType = (preference) => {
    return constants.CHARGE_TYPE[preference.charge]['CHARGE_TYPE'];
}

exports.getState = (preference) => {
    return preference.state.STATE;
}

exports.getDistrict = (preference) => {
    return preference.district.DISTRICT;
}

exports.parsePreference = (preference) => {
    var data;
    if(preference.search == '1'){
        data = {
            NAME : this.getName(preference),
            AGE : this.getAge(preference.year),
            VACCINE : this.getVaccine(preference),
            TYPE : this.getChargeType(preference),
            SEARCH_BY : this.getSearch(preference),
            PINCODE : this.getPincode(preference)
        }
    } else if(preference.search == '2') {
        data = {
            NAME : this.getName(preference),
            AGE : this.getAge(preference.year),
            VACCINE : this.getVaccine(preference),
            TYPE : this.getChargeType(preference).toUpperCase(),
            SEARCH_BY : this.getSearch(preference),
            STATE : this.getState(preference),
            DISTRICT : this.getDistrict(preference)
        }
    }
    return data;
}

exports.getAddress = (center) => {
    return `${center.address}, ${center.district_name} ${center.state_name} - ${center.pincode}`;
}

exports.isValid = (json) => {
    return json != null && typeof json != 'undefined';
}


exports.getVaccineCharge = (vaccine, charges) => {
    let filter = charges.filter((charge)=>{
        return charge['vaccine'] == vaccine;
    });
    return parseInt(filter[0]['fee']);
}


exports.reduceArray = (arr, type) => {
    return arr.reduce((obj, current) => {
        if(type == 1) obj[(current.state_id).toString()] = {code : current.state_id, STATE : current.state_name};
        else if(type == 2) obj[(current.district_id).toString()] = {code : current.district_id, DISTRICT : current.district_name};
        return obj;
    }, {});
}


exports.parseDate = (dateString) => {
    let date = dateString.split('-');
    return new Date(parseInt(date[2]), parseInt(date[1])-1, parseInt(date[0]));
}

function formatMonth(month){
    if(month>=1 && month<=9) return `0${month}`;
    else return month;
}


exports.getIDName = (preference) =>{
    return preference['photo_id_type'];
}


exports.formatDate = (date) => {
    return `${date.getDate()}-${formatMonth(date.getMonth()+1)}-${date.getFullYear()}`;
}


exports.getDoseAvailability = (session, preference) => {
    if(preference.dose == 1) return parseInt(session['dose1_availability']);
    else if(preference.dose == 2) return parseInt(session['dose2_availability']);
}


function getSecondDoseDuration(preference) {
    if(preference.vaccine == constants.VACCINE_CODE.COVISHIELD) return constants.MIN_DAYS.COVISHIELD;
    else if(preference.vaccine == constants.VACCINE_CODE.COVAXIN) return constants.MIN_DAYS.COVAXIN;
    else if(preference.vaccine == constants.VACCINE_CODE.SPUTNIK) return constants.MIN_DAYS.SPUTNIK;
}


exports.getSessionDetails = (session) => {
    var data = {
        CENTER : session['name'],
        DATE : session['date'],
        SLOT : session['slots'][0],
        VACCINE : session['vaccine'],
        CHARGE : session['charge_type']
    }
    if(session['charge_type']==constants.CHARGE_CODE.PAID) data['COST'] = session['charge'];
    return data;
}


function addDays(date, days) {
    date.setDate(date.getDate()+days);
    return date;
}


exports.getCalculatedVaccineDate = (preference) => {
    /*
    let today = new Date();
    if(preference.dose == 2){
        let dose1date = this.parseDate(preference['dose1_date']);
        let duration = getSecondDoseDuration(preference);
        let dose2date = addDays(dose1date, duration);
        if(dose2date >= today) return this.formatDate(dose2date);
        else return this.formatDate(today);
    } else return this.formatDate(today);
    */
    return this.formatDate(addDays(new Date(), 1));
}


exports.getMobile = () => {
    return constants.SESSION.mobile;
}


exports.updateMobile = (mobile) => {
    constants.SESSION.mobile = mobile;
}


exports.readToken = () => {
    return constants.SESSION.token;
}

exports.updateToken = (token) => {
    constants.SESSION.token = token;
}
