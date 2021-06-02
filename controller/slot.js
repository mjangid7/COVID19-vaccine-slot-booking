const { default: axios } = require('axios');
const endpoints = require('./endpoints');
const util = require('../utils');
const user = require('./login');
const constants = require('../constants');
const captcha = require('./captcha');
const preferenceUtil = require('./preferences');

exports.getCentersByPin = (myDate, preference) => {
    let myPincode = util.getPincode(preference);
    let myVaccine = util.getVaccine(preference);
    console.warn(`Finding slots for ${myVaccine} for date: ${myDate} in pincode: ${myPincode}...`);
    var options = {
        params : {
            pincode : myPincode,
            date : myDate,
            vaccine : myVaccine
        }, 
        headers: {
            'authority' : 'cdn-api.co-vin.in',
            'method' : 'GET',
            'path' : `/api/v2/appointment/sessions/calendarByPin?pincode=${myPincode}&date=${myDate}&vaccine=${myVaccine}`,
            'scheme' : 'https',
            'accept' : 'application/json, text/plain, */*',
            'accept-encoding' : 'gzip, deflate, br',
            'accept-language' : 'en-GB,en-US;q=0.9,en;q=0.8',
            'authorization' : `Bearer ${util.readToken()}`,
            'origin' : 'https://selfregistration.cowin.gov.in',
            'referer' : 'https://selfregistration.cowin.gov.in/',
            'sec-ch-ua' : '"Not A;Brand";v="99", "Chromium";v="90", "Google Chrome";v="90"',
            'sec-ch-ua-mobile' : '?0',
            'sec-fetch-dest' : 'empty',
            'sec-fetch-mode' : 'cors',
            'sec-fetch-site' : 'cross-site',
            'user-agent' : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36'
        }
    }
    return new Promise((resolve, reject)=>{
        axios
        .get(endpoints.GET_CENTER_BY_PINCODE, options)
        .then((response)=>{
            if(response.status == 200){
                let sessions = parseCenters(response.data.centers);
                sessions = filterSessions(sessions, preference);
                resolve(sessions);
            } else if(response.status == 401) {
                user.generteNewToken()
                .then((newToken)=>{
                    util.updateToken(newToken);
                    this.getCentersByPin(myDate, preference)
                    .then((data)=>{
                        resolve(data);
                    })
                    .catch((error)=>{
                        reject(error);
                    });
                })
                .catch((error)=>{
                    console.log(error);
                    process.exit();
                });
            } else if(response.status == 429) {
                reject(new Error(`Maximum trying limit reached.. Please try after ${response.headers['Retry-After']} minutes!`));
            } else {
                reject(new Error(`Response not OK: ${response.statusText}`));
            }
        })
        .catch((error)=>{
            reject(new Error(`Error fetching centres for pincode ${myPincode}: ${error}`));      
        });
    });
}


exports.findSlotsByPin = (date, preference) => {
    return new Promise((resolve, reject)=>{
        this.getCentersByPin(date, preference)
        .then((sessions)=>{
            if(sessions.length>0){
                resolve(sessions);
            } else {
                setTimeout(()=>{
                    this.findSlotsByPin(date, preference)
                    .then((data)=>{
                        resolve(data);
                    })
                    .catch((error)=>{
                        reject(error);
                    });
                }, constants.FREQUENCY.SLOT_FINDING_FREQUENCY);
            }
        })
        .catch((error)=>{
            reject(error);
        });
    });
}


exports.findSlotsByDistrict = (date, preference) => {
    return new Promise((resolve, reject)=>{
        this.getCentersByDistrict(date, preference)
        .then((sessions)=>{
            if(sessions.length>0){
                resolve(sessions);
            } else {
                setTimeout(()=>{
                    this.findSlotsByDistrict(date, preference)
                    .then((data)=>{
                        resolve(data);
                    })
                    .catch((error)=>{
                        reject(error);
                    });
                }, constants.FREQUENCY.SLOT_FINDING_FREQUENCY);
            }
        })
        .catch((error)=>{
            reject(error);
        });
    });
}


exports.getCentersByDistrict = (myDate, preference) => {
    let myVaccine = util.getVaccine(preference);
    let districtId = preference.district.code;
    console.warn(`Finding slots for ${myVaccine} for date: ${myDate} in ${preference.district.DISTRICT} district...`);
    var options = {
        params : {
            district_id : districtId,
            date : myDate,
            vaccine : myVaccine
        },
        headers: {
            'authority' : 'cdn-api.co-vin.in',
            'method' : 'GET',
            'path' : `/api/v2/appointment/sessions/calendarByDistrict?district_id=${districtId}&date=${myDate}&vaccine=${myVaccine}`,
            'scheme' : 'https',
            'accept' : 'application/json, text/plain, */*',
            'accept-encoding' : 'gzip, deflate, br',
            'accept-language' : 'en-GB,en-US;q=0.9,en;q=0.8',
            'authorization' : `Bearer ${util.readToken()}`,
            'origin' : 'https://selfregistration.cowin.gov.in',
            'referer' : 'https://selfregistration.cowin.gov.in/',
            'sec-ch-ua' : '"Not A;Brand";v="99", "Chromium";v="90", "Google Chrome";v="90"',
            'sec-ch-ua-mobile' : '?0',
            'sec-fetch-dest' : 'empty',
            'sec-fetch-mode' : 'cors',
            'sec-fetch-site' : 'cross-site',
            'user-agent' : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36'
        }
    }
    return new Promise((resolve, reject)=>{
        axios
        .get(endpoints.GET_CENTER_BY_DISTRICT, options)
        .then((response)=>{
            if(response.status == 200){
                let sessions = parseCenters(response.data.centers);
                sessions = filterSessions(sessions, preference);
                resolve(sessions);
            } else if(response.status == 401) {
                user.generteNewToken()
                .then((newToken)=>{
                    util.updateToken(newToken);
                    this.getCentersByDistrict(myDate, preference)
                    .then((data)=>{
                        resolve(data);
                    })
                    .catch((error)=>{
                        reject(error);
                    });
                })
                .catch((error)=>{
                    console.log(error);
                    process.exit();
                });
            } else if(response.status == 429) {
                reject(new Error(`Maximum trying limit reached.. Please try after ${response.headers['Retry-After']} minutes!`));
            } else {
                reject(new Error(`Error fetching centres in district ${preference.district.DISTRICT}: ${response.statusText}`));
            }
        })
        .catch((error)=>{
            reject(new Error(`Error fetching centres in district ${preference.district.DISTRICT}: ${error}`));      
        });   
    });
}

function filterSessions(sessions, preference){
    return sessions.filter((session) => {
        return session['vaccine'] == util.getVaccine(preference)
        && session['charge_type'] == util.getChargeType(preference)
        && session['min_age'] <= util.getAge(preference.year)
        && util.getDoseAvailability(session, preference) > 0;
    });
}


function parseCenters(centers){
    let data = [];
    for(let i=0; i<centers.length; i++){
        let center = centers[i];
        let sessions = center['sessions'];
        for(let j=0; j<sessions.length; j++) {
            let session = sessions[j];
            let sessionDetail = {
                name : center['name'],
                center_id : center['center_id'],
                session_id : session['session_id'],
                address : util.getAddress(center),
                charge_type : center['fee_type'],
                min_age : session['min_age_limit'],
                vaccine : session['vaccine'],
                date : session['date'],
                dose1_availability : session['available_capacity_dose1'],
                dose2_availability : session['available_capacity_dose2'],
                slots : session['slots']
            }
            if(sessionDetail['charge_type']==constants.CHARGE_CODE.PAID){
                sessionDetail['charge'] = util.getVaccineCharge(sessionDetail['vaccine'], center['vaccine_fees']);
            } else {
                sessionDetail['charge'] = null;
            }
            data.push(sessionDetail);
        }
    }
    return data;
}

exports.bookAppointment = (session, preference) => {
    return new Promise((resolve, reject)=>{
        captcha.getCaptcha()
        .then((captcha)=>{
            this.bookSlot(session, preference, captcha)
            .then((response)=>{
                if(response.status == 200){
                    resolve(response.data.appointment_confirmation_no);
                } else {
                    setTimeout(() => {
                        this.bookAppointment(session, preference)
                        .then((response)=>{
                            resolve(response);
                        })
                        .catch((error)=>{
                            reject(error);
                        });
                    }, constants.FREQUENCY.SLOT_BOOKING_FREQUENCY);
                }
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



exports.bookSlot = (session, preference, captcha)=>{
    console.log('Trying to book slot...');
    var options = { 
        headers: {
            'authority' : 'cdn-api.co-vin.in',
            'method' : 'POST',
            'path' : '/api/v2/appointment/schedule',
            'scheme' : 'https',
            'accept' : 'application/json, text/plain, */*',
            'accept-encoding' : 'gzip, deflate, br',
            'accept-language' : 'en-GB,en-US;q=0.9,en;q=0.8',
            'authorization' : `Bearer ${util.readToken()}`,
            'origin' : 'https://selfregistration.cowin.gov.in',
            'referer' : 'https://selfregistration.cowin.gov.in/',
            'sec-ch-ua' : '"Not A;Brand";v="99", "Chromium";v="90", "Google Chrome";v="90"',
            'sec-ch-ua-mobile' : '?0',
            'sec-fetch-dest' : 'empty',
            'sec-fetch-mode' : 'cors',
            'sec-fetch-site' : 'cross-site',
            'user-agent' : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36'
        }
    }

    data = {
        dose : preference['dose'],
        session_id : session['session_id'],
        center_id : session['center_id'],
        slot : session['slots'][0],
        beneficiaries : [preference['beneficiary']],
        captcha : captcha
    }

    return new Promise((resolve, reject)=>{
        axios
        .post(endpoints.BOOK_APPOINTMENT,data, options)
        .then((response)=>{
            if(response.status == 200){
                resolve(response);
            } else if(response.status == 401){
                user.generteNewToken()
                .then((newToken)=>{
                    util.updateToken(newToken);
                    this.bookAppointment(session, preference)
                    .then((data)=>{
                        resolve(data);
                    })
                    .catch((error)=>{
                        reject(error);
                    });
                })
                .catch((error)=>{
                    console.log(error);
                    process.exit();
                });
            } else {
                reject(new Error(`Error booking appointment: ${response.statusText}`));
            }
        })
        .catch((error)=>{
            reject(new Error(`Error booking appointment: ${error}`));
        });
    });
}