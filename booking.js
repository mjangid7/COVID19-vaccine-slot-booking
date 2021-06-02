const prompt = require("prompt-sync")({ sigint: true });
const user = require("./controller/login");
const beneficiary = require("./controller/user");
const constants = require("./constants");
const loader = require("./controller/preferences");
const util = require("./utils");
const slot = require("./controller/slot");

console.log(
  "\n###############   Welcome to the Automated Slot Booking  ###############\n"
);

var mobile = prompt("Enter Your Mobile Number: ");
while (isNaN(mobile) || mobile.length != 10)
  mobile = prompt("Please enter correct Mobile Number: ");
user
  .login(mobile)
  .then((token) => {
    util.updateToken(token);
    util.updateMobile(mobile);
    console.log("User logged in successfully!");
    showBeneficiaries();
  })
  .catch((error) => {
    console.log("User can not logged in!");
    console.log("Error Occurred: " + error);
  });

function showBeneficiaries() {
  beneficiary
    .getBeneficiaries()
    .then((beneficiaryList) => {
      var yetToReceiveVaccination = beneficiaryList.filter(function (
        beneficiary
      ) {
        return (
          beneficiary.vaccination_status !=
          constants.VACCINATION_STATUS.VACCINATED
        );
      });
      if (yetToReceiveVaccination.length == 0) {
        console.log("\nCongratulations, All Beneficiaries got Vaccinated!");
        console.table(beneficiary.parseBeneficiary(beneficiaryList));
      } else {
        console.log("Beneficiaries, who are yet to receive vaccination are: ");
        console.table(beneficiary.parseBeneficiary(yetToReceiveVaccination));
        if (yetToReceiveVaccination.length == 1) {
          searchForPreferences(yetToReceiveVaccination);
        } else {
          var inputs = prompt(
            "Enter comma separated value of indexes for which you want to book slots: "
          );
          var indexs = inputs.split(",");
          var bookSlotFor = [];
          indexs.forEach(function (index) {
            bookSlotFor.push(yetToReceiveVaccination[index.trim()]);
          });
          searchForPreferences(bookSlotFor);
        }
      }
    })
    .catch((error) => {
      console.log("Can not get Beneficiaries!");
      console.log("Error Occurred: " + error);
    });
}

function searchForPreferences(beneficiaries) {
  beneficiaries.forEach((beneficiary) => {
    console.log(`Loading preferences for ${beneficiary.name}...`);
    var preference = loader.findAndLoad(beneficiary);
    let processSave = false;
    if (preference == null) {
      processSave = true;
      console.log(`Preferences for ${beneficiary.name} not found...`);
      loader
        .createPreference(beneficiary)
        .then((newPreference) => {
          processPreference(beneficiary, newPreference, processSave)
            .then((processedNewPreference) => {
              checkAndBook(processedNewPreference);
            })
            .catch((error) => {
              console.log(error);
              process.exit();
            });
        })
        .catch((error) => {
          console.log(error);
          process.exit();
        });
    } else {
      processPreference(beneficiary, preference, processSave)
        .then((processedOldPreference) => {
          checkAndBook(processedOldPreference);
        })
        .catch((error) => {
          console.log(error);
          process.exit();
        });
    }
  });
}

async function checkAndBook(preference) {
  let date = util.getCalculatedVaccineDate(preference);
  var sessions;
  try {
    if (preference.search == constants.SEARCH_CODE.SEARCH_BY_PIN) {
      sessions = await slot.findSlotsByPin(date, preference);
    } else if (preference.search == constants.SEARCH_CODE.SEARCH_BY_DITRICT) {
      sessions = await slot.findSlotsByDistrict(date, preference);
    }
    if (sessions.length > 0) {
      //console.log(`Congratulations! ${sessions.length} sessions found...`);
      //console.table(sessions, ['name', 'min_age', 'vaccine', 'date']);
      console.log(`Congratulations!.. Matching session found...\n`);
      slot
        .bookAppointment(sessions[0], preference)
        .then((response) => {
          console.log(
            `\nCongratulation!! Appointment Booked successfully with appointment number: ${response}`
          );
          console.log(
            `Appointment Details for ${util.getName(
              preference
            )} are as follows:`
          );
          console.table(util.getSessionDetails(sessions[0]));
          console.log(
            `Do not forget to take ${util.getIDName(preference)} with you!`
          );
          console.log("Happy Vaccination!!...");
          process.exit();
        })
        .catch((error) => {
          console.log(`Error occurred while booking slot: ${error}`);
          process.exit();
        });
    } else console.warn("No centers found for matching preference...");
  } catch (err) {
    console.log(err);
    process.exit();
  }
}

function updateAdditionalInfo(preference, beneficiary) {
  if (
    beneficiary["vaccination_status"] ==
    constants.VACCINATION_STATUS.NOT_VACCINATED
  )
    preference["dose"] = 1;
  else if (
    beneficiary["vaccination_status"] ==
    constants.VACCINATION_STATUS.PARTIALLY_VACCINATED
  )
    preference["dose"] = 2;
  preference["beneficiary"] = beneficiary["beneficiary_reference_id"];
  preference["dose1_date"] = beneficiary["dose1_date"];
  preference["photo_id_type"] = beneficiary["photo_id_type"];
  return preference;
}

function processPreference(beneficiary, preference, processSave) {
  return new Promise((resolve, reject) => {
    console.table(util.parsePreference(preference));
    console.log("Press 1 to Confirm\nPress 2 to Edit");
    let decision = parseInt(prompt("Please enter your choice: "));
    while (decision != 1 && decision != 2)
      decision = parseInt(prompt("Please enter correct choice: "));
    if (decision == 1) {
      if (processSave) {
        let save = prompt(
          "Do you want to save above preference for future reference (y/n): "
        );
        while (save.toLowerCase() != "y" && save.toLowerCase() != "n")
          save = prompt("Please enter correct choice: ");
        if (save.toLowerCase() == "y")
          loader.savePreference(
            beneficiary.beneficiary_reference_id,
            preference
          );
      }
      resolve(updateAdditionalInfo(preference, beneficiary));
    } else {
      loader
        .createPreference(beneficiary)
        .then((newPreference) => {
          processPreference(beneficiary, newPreference, true)
            .then((updatedPreference) => {
              resolve(updatedPreference);
            })
            .catch((error) => {
              reject(error);
            });
        })
        .catch((error) => {
          reject(error);
        });
    }
  });
}
