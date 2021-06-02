const { default: axios } = require('axios');
const endpoints = require('./endpoints');
const utils = require('../utils');
const user = require('./login');

exports.getBeneficiaries = () => {
    var options = {
        headers: {
            'authority' : 'cdn-api.co-vin.in',
            'method' : 'GET',
            'path' : '/api/v2/appointment/beneficiaries',
            'scheme' : 'https',
            'accept' : 'application/json, text/plain, */*',
            'accept-encoding' : 'gzip, deflate, br',
            'accept-language' : 'en-GB,en-US;q=0.9,en;q=0.8',
            'authorization' : `Bearer ${utils.readToken()}`,
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
        .get(endpoints.GET_BENEFICIARIES, options)
        .then((response) => {
            if(response.status == 200) {
                resolve(response.data.beneficiaries);
            } else if(response.status == 401) {
                user.generteNewToken()
                .then((newToken)=>{
                    utils.updateToken(newToken);
                    this.getBeneficiaries()
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
            reject(new Error(`Error fetching beneficiaries: ${error}`));
        });
    });
}


exports.parseBeneficiary = function(beneficiaryList) {
    data = [];
    for(var i=0; i<beneficiaryList.length; i++){
        data.push({
            NAME : beneficiaryList[i]['name'],
            AGE : utils.getAge(beneficiaryList[i]['birth_year']),
            GENDER : utils.getGender(beneficiaryList[i]['gender']),
            STATUS : beneficiaryList[i]['vaccination_status']
        });
    }
    return data;
}