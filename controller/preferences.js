const fs = require('fs');
const constants = require('../constants');
const geography = require('./location');
const prompt = require('prompt-sync')({sigint : true});
const PATH = './preferences/';
const FORMAT = '.json';
const util = require('../utils');
var STATE_LIST;


function populateStates() {
    geography.getStates()
    .then((states)=>{
        STATE_LIST = states;
    })
    .catch((err)=>{
    });
}

exports.findAndLoad = (beneficiary) => {
    var file = PATH+beneficiary.beneficiary_reference_id+FORMAT;
    if(!fs.existsSync(file)){
        return null;
    } else {
        try {
            return JSON.parse(fs.readFileSync(file));
        } catch(err){
            return null;
        }
    }
}


exports.savePreference = (beneficiary_id, preferences) => {
    var file = PATH+beneficiary_id+FORMAT;
    if(!fs.existsSync(PATH)) fs.mkdirSync(PATH);
    fs.writeFile(file, JSON.stringify(preferences), (err) =>{
        if(err) {
            //console.log('Error Occured in saving preferences: ' + err);
        } else {
            //console.log('Preferences successfully saved!');
        }
    }); 
}


exports.deletePreference = (beneficiary_id) => {
    var file = PATH+beneficiary_id+FORMAT;
    fs.access(file, fs.constants.F_OK, (err) => {
        if(err) console.log('File not found!');
        else {
            fs.unlink(file, (error) => {
                if(error) console.log('Unable to delete file!');
                else console.log('File successfully deleted!');
            });
        }
    });
}


exports.createPreference = (beneficiary) => {
    populateStates();
    return new Promise((resolve, reject) =>{
        var vaccinePreference = getVaccinePreference(beneficiary);
        var chargePreference = getChargePreference();
        var searchPreference = getSearchPreference();
        var pincodePreference = getPincodePreference(searchPreference);
        getStatePreference(searchPreference)
        .then((statePreference)=>{
            getDistrictPreference(searchPreference, statePreference)
            .then((districtPreference)=>{
                var data = {
                    name : beneficiary.name,
                    year : beneficiary.birth_year,
                    search : searchPreference,
                    pincode : pincodePreference,
                    state : statePreference,
                    district : districtPreference,
                    vaccine : vaccinePreference,
                    charge : chargePreference
                }
                resolve(data);
            })
            .catch((error)=>{
               reject(error);
            });
        })
        .catch((error)=>{
            reject(error);
        });
    });
}


function getSearchPreference() {
    var searchCriterias = constants.SEARCH_BY;
    console.table(searchCriterias, ['SEARCH_CRITERIA']);
    let search_code = prompt('Press enter your preffered search code: ');
    while(!util.isValid(searchCriterias[search_code])) {
        search_code = prompt('Please enter correct search code: ');
    }
    return search_code;
}

function getStatePreference(searchPreference) {
    return new Promise((resolve, reject)=>{
        if(searchPreference == '2') {
            if(util.isValid(STATE_LIST)) {
                console.table(STATE_LIST, ['STATE']);
                let state_code = prompt('Please enter the state code: ');
                while(!util.isValid(STATE_LIST[state_code]))
                    state_code = prompt('Please enter the correct state code: ');
                resolve(STATE_LIST[state_code]);
            } else {
                geography.getStates()
                .then((states)=>{
                    STATE_LIST = states;
                    console.table(STATE_LIST, ['STATE']);
                    let state_code = prompt('Please enter the state code: ');
                    while(!util.isValid(STATE_LIST[state_code]))
                        state_code = prompt('Please enter the correct state code: ');
                    resolve(STATE_LIST[state_code]);
                })
                .catch((err)=>{
                    reject(err);
                });
            }
        } else resolve(null);
    });
}


function getDistrictPreference(searchPreference, statePreference) {
    return new Promise((resolve, reject)=>{
        if(searchPreference == '2' && statePreference!=null) {
            geography.getDistricts(statePreference.code)
            .then((districts)=>{
                console.table(districts, ['DISTRICT']);
                let district_code = prompt('Please enter the district code: ');
                while(!util.isValid(districts[district_code]))
                    district_code = prompt('Please enter the correct district code: ');
                resolve(districts[district_code]);
            })
            .catch((err)=>{
                reject(err);
            });
        } else resolve(null);
    });
}


function getVaccinePreference(beneficiary) {
    if(util.isValid(beneficiary.vaccine) && beneficiary.vaccine!='') {
        return constants.VACCINE_CODE[beneficiary.vaccine];
    } else {
        let vaccines = constants.VACCINE_TYPE;
        console.table(vaccines, ['VACCINE']);
        let vaccine_code = prompt('Enter your preffered vaccine code: ');
        while(!util.isValid(vaccines[vaccine_code]))
            vaccine_code = prompt('Please enter correct code for vaccine: ');
        return vaccine_code;
    }
}


function getChargePreference() {
    let charges = constants.CHARGE_TYPE;
    console.table(charges, ['CHARGE_TYPE']);
    let charge_code = prompt('Please enter charge type: ');
    while(!util.isValid(charges[charge_code]))
        charge_code = prompt('Please enter correct charge code');
    return charge_code;
}


function getPincodePreference(searchPreference) {
    if(searchPreference == '1') {
        let pincode = prompt('Enter your Pincode: ');
        while(isNaN(pincode))
            pincode = prompt('Please enter correct Pincode: ');
        return parseInt(pincode);
    } else {
        return null;
    }
}