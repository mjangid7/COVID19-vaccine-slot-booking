const { default: axios } = require('axios');
const crypto = require('crypto');
const endpoints = require('./endpoints');
const util = require('../utils');
const prompt = require('prompt-sync')({sigint : true});

function getHash(otp){
    var encoded = Buffer.from(otp, 'utf-8');
    return crypto.createHash('sha256').update(encoded).digest('hex');
}

exports.login = function(mobileNumber) {
    const options = {
        headers: {
            'authority' : 'cdn-api.co-vin.in',
            'method' : 'POST',
            'path' : '/api/v2/auth/generateMobileOTP',
            'scheme' : 'https',
            'accept' : 'application/json, text/plain, */*',
            'accept-encoding' : 'gzip, deflate, br',
            'accept-language' : 'en-GB,en-US;q=0.9,en;q=0.8',
            'content-length' : '121',
            'content-type' : 'application/json',
            'origin' : 'https://selfregistration.cowin.gov.in',
            'referer' : 'https://selfregistration.cowin.gov.in/',
            'sec-ch-ua' : '"Not A;Brand";v="99", "Chromium";v="90", "Google Chrome";v="90"',
            'sec-ch-ua-mobile' : '?0',
            'sec-fetch-dest' : 'empty',
            'sec-fetch-mode' : 'cors',
            'sec-fetch-site' : 'cross-site',
            'user-agent' : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36'
        }
    }

    data = {
        mobile : mobileNumber,
        secret:'U2FsdGVkX1/hd9dh9pTViQt395ew1rdxdzH3hYk426eGz9c4kjREdsmffPgmrylHJ6vV2zV+CtK2BEiKdprbeQ=='
    }
    
    return new Promise(function(resolve, reject){
        axios
        .post(endpoints.GET_OTP, data, options)
        .then((response)=>{
            if(response.status == 200) {
                console.log(`OTP successfully sent to ${mobileNumber}`);
                validateOTP(response.data.txnId)
                .then((token)=>{
                    resolve(token);
                })
                .catch((error)=>{
                    reject(error);
                });  
            } else {
                reject(new Error(`Response not OK: ${response.statusText}`));
            }
        })
        .catch((error)=>{
            reject(new Error(`Error while login in: ${error}`));
        });
    });
}


function validateOTP(transactionId) {
    const otp = prompt('Enter the OTP received: ');
    const options = {
        headers: {
            'authority' : 'cdn-api.co-vin.in',
            'method' : 'POST',
            'path' : '/api/v2/auth/validateMobileOtp',
            'scheme' : 'https',
            'accept' : 'application/json, text/plain, */*',
            'accept-encoding' : 'gzip, deflate, br',
            'accept-language' : 'en-GB,en-US;q=0.9,en;q=0.8',
            'content-length' : '121',
            'content-type' : 'application/json',
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

    data =  {
        otp : getHash(otp),
        txnId : transactionId
    }

    return new Promise(function(resolve, reject){
        axios
        .post(endpoints.VALIDATE_OTP, data, options)
        .then((response)=>{
            if(response.status == 200) {
                resolve(response.data.token);
            } else {
                reject(new Error(`Response not OK: ${response.statusText}`));  
            }
        })
        .catch((error)=>{
            reject(new Error(`Error Occurred while validating OTP: ${error}`));
        });
    });
}


exports.generteNewToken = () => {
    console.log('#########  Token expired!...Generating New Token!  #########');
    return new Promise((resolve, reject)=>{
        this.login(util.getMobile())
        .then((token)=>{
            resolve(token);
        })
        .catch((error)=>{
            reject(error);
        });
    });
}

