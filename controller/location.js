const { default: axios } = require('axios');
const endpoints = require('./endpoints');
const formatter = require('util');
const util = require('../utils');
const user = require('./login');

exports.getStates = () => {
    var options = {
        headers: {
            'authority' : 'cdn-api.co-vin.in',
            'method' : 'GET',
            'path' : '/api/v2/admin/location/states',
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

    return new Promise((resolve, reject) => {
        axios
        .get(endpoints.GET_STATES, options)
        .then((response) => {
            if(response.status == 200) {
                resolve(util.reduceArray(response.data.states, 1));
            } else if(response.status == 401) {
                user.generteNewToken()
                .then((newToken)=>{
                    util.updateToken(newToken);
                    this.getStates()
                    .then((data)=>{
                        resolve(data);
                    })
                    .catch((error)=>{
                        reject(error);
                    })
                })
                .catch((error)=>{
                    reject(error);
                });
            } else {
                reject(new Error(`Response not OK: ${response.statusText}`));
            }
        })
        .catch((error) => {
            reject(new Error(`Error fetching states: ${error}`));
        });
    });
}


exports.getDistricts = (state_id) => {
    var options = {
        headers: {
            'authority' : 'cdn-api.co-vin.in',
            'method' : 'GET',
            'path' : `/api/v2/admin/location/${state_id}`,
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
        .get(formatter.format(endpoints.GET_DISTRICTS, state_id), options)
        .then((response) => {
            if(response.status == 200) {
                resolve(util.reduceArray(response.data.districts, 2));
            } else if(response.status == 401){
                user.generteNewToken()
                .then((newToken)=>{
                    util.updateToken(newToken);
                    this.getDistricts(state_id)
                    .then((data)=>{
                        resolve(data);
                    })
                    .catch((error)=>{
                        reject(error);
                    });
                })
                .catch((error)=>{
                    reject(error);
                });
            } else {
                reject(new Error(`Response not OK: ${response.statusText}`));
            }
        })
        .catch((error) => {
            reject(new Error(`Error fetching distrcits: ${error}`));
        });
    });
}