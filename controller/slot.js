const { default: axios } = require("axios");
const endpoints = require("./endpoints");
const util = require("../utils");
const user = require("./login");
const constants = require("../constants");
const captcha = require("./captcha");
const preferenceUtil = require("./preferences");

const MAX_RETRIES = 5; // Define max retries for slot finding and booking

// Helper function for common Axios GET request headers
const getAxiosGetOptions = (token, pathParams = "") => ({
  headers: {
    authority: "cdn-api.co-vin.in",
    method: "GET",
    path: `/api/v2/appointment/sessions/${pathParams}`, // Path will be appended by specific function
    scheme: "https",
    accept: "application/json, text/plain, */*",
    "accept-encoding": "gzip, deflate, br",
    "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
    authorization: `Bearer ${token}`,
    origin: "https://selfregistration.cowin.gov.in",
    referer: "https://selfregistration.cowin.gov.in/",
    "sec-ch-ua":
      '"Not A;Brand";v="99", "Chromium";v="90", "Google Chrome";v="90"',
    "sec-ch-ua-mobile": "?0",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "cross-site",
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36",
  },
});

// Helper function for common Axios POST request headers
const getAxiosPostOptions = (token) => ({
  headers: {
    authority: "cdn-api.co-vin.in",
    method: "POST",
    path: "/api/v2/appointment/schedule", // Specific to booking
    scheme: "https",
    accept: "application/json, text/plain, */*",
    "accept-encoding": "gzip, deflate, br",
    "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
    authorization: `Bearer ${token}`,
    origin: "https://selfregistration.cowin.gov.in",
    referer: "https://selfregistration.cowin.gov.in/",
    "sec-ch-ua":
      '"Not A;Brand";v="99", "Chromium";v="90", "Google Chrome";v="90"',
    "sec-ch-ua-mobile": "?0",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "cross-site",
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36",
  },
});

exports.getCentersByPin = async (myDate, preference) => {
  const myPincode = util.getPincode(preference);
  const myVaccine = util.getVaccine(preference);
  console.warn(
    `Finding slots for ${myVaccine} for date: ${myDate} in pincode: ${myPincode}...`
  );

  const params = {
    pincode: myPincode,
    date: myDate,
    vaccine: myVaccine,
  };
  const pathParams = `calendarByPin?pincode=${myPincode}&date=${myDate}&vaccine=${myVaccine}`;
  
  try {
    const options = { ...getAxiosGetOptions(util.readToken(), pathParams), params: params };
    const response = await axios.get(endpoints.GET_CENTER_BY_PINCODE, options);

    if (response.status === 200) {
      let sessions = parseCenters(response.data.centers);
      sessions = filterSessions(sessions, preference);
      return sessions;
    } else {
      // This case should ideally not be reached if axios throws for non-2xx status codes.
      // However, keeping it for robustness.
      throw new Error(`Response not OK: ${response.statusText} (Status: ${response.status})`);
    }
  } catch (error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      if (error.response.status === 401) {
        console.log("Token expired or invalid. Attempting to refresh token...");
        try {
          const newToken = await user.generteNewToken();
          util.updateToken(newToken);
          // Retry the original request with the new token
          // Note: Recursive call, ensure it doesn't lead to infinite loops on persistent auth failure.
          // The generteNewToken itself should handle errors and exit if it can't get a new token.
          return exports.getCentersByPin(myDate, preference);
        } catch (tokenError) {
          console.error("Failed to refresh token:", tokenError);
          // process.exit() might be too abrupt. Throwing error is better for handling upstream.
          throw new Error(`Failed to refresh token: ${tokenError.message || tokenError}`);
        }
      } else if (error.response.status === 429) {
        const retryAfter = error.response.headers["retry-after"] || "some time";
        throw new Error(
          `Too many requests (429). Please try again after ${retryAfter} seconds/minutes.`
        );
      } else {
        throw new Error(
          `Error fetching centres for pincode ${myPincode}: Server responded with status ${error.response.status} - ${error.response.statusText || error.message}`
        );
      }
    } else if (error.request) {
      // The request was made but no response was received
      throw new Error(
        `Error fetching centres for pincode ${myPincode}: No response received from server. ${error.message}`
      );
    } else {
      // Something happened in setting up the request that triggered an Error
      throw new Error(
        `Error fetching centres for pincode ${myPincode}: ${error.message}`
      );
    }
  }
};

// Helper function for retrying an async operation
const retryAsync = async (asyncFn, maxRetries, delayMs, failureMessage) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await asyncFn();
      if (result && (!Array.isArray(result) || result.length > 0)) { // Ensure result is meaningful (not empty array if that's a "not found" criteria)
        return result;
      }
      // If result is an empty array (meaning no slots found), continue to retry
      if (Array.isArray(result) && result.length === 0 && i < maxRetries -1) {
         console.log(`Attempt ${i + 1} of ${maxRetries}: No results yet, retrying after ${delayMs / 1000}s...`);
         await new Promise(resolve => setTimeout(resolve, delayMs));
         continue;
      }
    } catch (error) {
      // Log error and retry if not the last attempt
      console.error(`Attempt ${i + 1} failed: ${error.message}`);
      if (i === maxRetries - 1) {
        throw new Error(`${failureMessage} after ${maxRetries} attempts: ${error.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  throw new Error(`${failureMessage} after ${maxRetries} attempts. No slots found or operation failed.`);
};


exports.findSlotsByPin = async (date, preference) => {
  const findAction = async () => {
    const sessions = await exports.getCentersByPin(date, preference);
    if (sessions && sessions.length > 0) {
      return sessions;
    }
    return []; // Return empty array to indicate "not found yet" for retryAsync logic
  };

  try {
    return await retryAsync(
      findAction,
      MAX_RETRIES,
      constants.FREQUENCY.SLOT_FINDING_FREQUENCY,
      "Failed to find slots by Pin"
    );
  } catch (error) {
    console.error(`findSlotsByPin ultimately failed: ${error.message}`);
    throw error; // Re-throw the error to be handled by the caller
  }
};

exports.findSlotsByDistrict = async (date, preference) => {
  const findAction = async () => {
    const sessions = await exports.getCentersByDistrict(date, preference);
    if (sessions && sessions.length > 0) {
      return sessions;
    }
    return []; // Return empty array to indicate "not found yet" for retryAsync logic
  };

  try {
    return await retryAsync(
      findAction,
      MAX_RETRIES,
      constants.FREQUENCY.SLOT_FINDING_FREQUENCY,
      "Failed to find slots by District"
    );
  } catch (error) {
    console.error(`findSlotsByDistrict ultimately failed: ${error.message}`);
    throw error; // Re-throw the error to be handled by the caller
  }
};

exports.getCentersByDistrict = async (myDate, preference) => {
  const myVaccine = util.getVaccine(preference);
  const districtId = preference.district.code;
  const districtName = preference.district.DISTRICT;
  console.warn(
    `Finding slots for ${myVaccine} for date: ${myDate} in ${districtName} district...`
  );

  const params = {
    district_id: districtId,
    date: myDate,
    vaccine: myVaccine,
  };
  const pathParams = `calendarByDistrict?district_id=${districtId}&date=${myDate}&vaccine=${myVaccine}`;

  try {
    const options = { ...getAxiosGetOptions(util.readToken(), pathParams), params: params };
    const response = await axios.get(endpoints.GET_CENTER_BY_DISTRICT, options);

    if (response.status === 200) {
      let sessions = parseCenters(response.data.centers);
      sessions = filterSessions(sessions, preference);
      return sessions;
    } else {
      throw new Error(`Response not OK: ${response.statusText} (Status: ${response.status})`);
    }
  } catch (error) {
    if (error.response) {
      if (error.response.status === 401) {
        console.log("Token expired or invalid. Attempting to refresh token...");
        try {
          const newToken = await user.generteNewToken();
          util.updateToken(newToken);
          return exports.getCentersByDistrict(myDate, preference); // Retry with new token
        } catch (tokenError) {
          console.error("Failed to refresh token:", tokenError);
          throw new Error(`Failed to refresh token: ${tokenError.message || tokenError}`);
        }
      } else if (error.response.status === 429) {
        const retryAfter = error.response.headers["retry-after"] || "some time";
        throw new Error(
          `Too many requests (429) while fetching for district ${districtName}. Please try again after ${retryAfter} seconds/minutes.`
        );
      } else {
        throw new Error(
          `Error fetching centres for district ${districtName}: Server responded with status ${error.response.status} - ${error.response.statusText || error.message}`
        );
      }
    } else if (error.request) {
      throw new Error(
        `Error fetching centres for district ${districtName}: No response received from server. ${error.message}`
      );
    } else {
      throw new Error(
        `Error fetching centres for district ${districtName}: ${error.message}`
      );
    }
  }
};

function filterSessions(sessions, preference) {
  return sessions.filter((session) => {
    return (
      session["vaccine"] == util.getVaccine(preference) &&
      session["charge_type"] == util.getChargeType(preference) &&
      session["min_age"] <= util.getAge(preference.year) &&
      util.getDoseAvailability(session, preference) > 0
    );
  });
}

function parseCenters(centers) {
  let data = [];
  for (let i = 0; i < centers.length; i++) {
    let center = centers[i];
    let sessions = center["sessions"];
    for (let j = 0; j < sessions.length; j++) {
      let session = sessions[j];
      let sessionDetail = {
        name: center["name"],
        center_id: center["center_id"],
        session_id: session["session_id"],
        address: util.getAddress(center),
        charge_type: center["fee_type"],
        min_age: session["min_age_limit"],
        vaccine: session["vaccine"],
        date: session["date"],
        dose1_availability: session["available_capacity_dose1"],
        dose2_availability: session["available_capacity_dose2"],
        slots: session["slots"],
      };
      if (sessionDetail["charge_type"] == constants.CHARGE_CODE.PAID) {
        sessionDetail["charge"] = util.getVaccineCharge(
          sessionDetail["vaccine"],
          center["vaccine_fees"]
        );
      } else {
        sessionDetail["charge"] = null;
      }
      data.push(sessionDetail);
    }
  }
  return data;
}

exports.bookSlot = async (session, preference, captchaValue) => {
  console.log("Trying to book slot...");
  const options = getAxiosPostOptions(util.readToken());

  const payload = {
    dose: preference["dose"],
    session_id: session["session_id"],
    center_id: session["center_id"],
    slot: session["slots"][0], // Assuming the first slot is always chosen as per original logic
    beneficiaries: [preference["beneficiary"]],
    captcha: captchaValue,
  };

  try {
    const response = await axios.post(endpoints.BOOK_APPOINTMENT, payload, options);
    // Axios typically throws for non-2xx responses, so a direct check for response.status === 200 is good.
    // If it doesn't throw, and status is not 200, it's an unexpected situation.
    if (response.status === 200) {
      return response.data; // Return the data which includes appointment_confirmation_no
    } else {
      // This part might be redundant if Axios always throws on non-2xx.
      // However, it's a safeguard.
      throw new Error(`Booking attempt failed with status: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    if (error.response) {
      // Server responded with a status code outside the 2xx range
      if (error.response.status === 401) {
        console.log("Token expired during booking. Attempting to refresh token...");
        try {
          const newToken = await user.generteNewToken();
          util.updateToken(newToken);
          // Important: Do NOT recursively call bookAppointment here.
          // Throw a specific error or a signal to the caller (bookAppointment) to retry with the new token.
          // For now, throwing an error that indicates a token refresh happened.
          // The calling function (bookAppointment) will handle the retry.
          throw new Error("TOKEN_REFRESHED_RETRY_BOOKING"); 
        } catch (tokenError) {
          console.error("Failed to refresh token during booking:", tokenError);
          throw new Error(`Failed to refresh token: ${tokenError.message || tokenError}`);
        }
      } else if (error.response.status === 409) { // Conflict, e.g., slot already booked
         throw new Error(`Booking failed: ${error.response.data.error} (Status 409)`);
      } else if (error.response.status === 429) {
        const retryAfter = error.response.headers["retry-after"] || "some time";
        throw new Error(
          `Too many requests (429) during booking. Please try again after ${retryAfter} seconds/minutes.`
        );
      } else {
        // Other non-2xx errors
        const errorMessage = error.response.data && error.response.data.error 
          ? error.response.data.error
          : error.message;
        throw new Error(
          `Error booking appointment: Server responded with status ${error.response.status} - ${errorMessage}`
        );
      }
    } else if (error.request) {
      // No response received
      throw new Error(
        `Error booking appointment: No response received from server. ${error.message}`
      );
    } else {
      // Error setting up the request
      throw new Error(`Error booking appointment: ${error.message}`);
    }
  }
};

exports.bookAppointment = async (session, preference) => {
  const bookAction = async () => {
    try {
      const captchaValue = await captcha.getCaptcha(); // Get fresh captcha for each attempt
      const bookingResponse = await exports.bookSlot(session, preference, captchaValue);
      // Assuming bookSlot returns data with appointment_confirmation_no on success
      if (bookingResponse && bookingResponse.appointment_confirmation_no) {
        return bookingResponse.appointment_confirmation_no;
      }
      // If bookSlot didn't throw but didn't return confirmation, it's an issue.
      // This path should ideally not be hit if bookSlot is robust.
      throw new Error("Booking seemed to succeed but no confirmation number was returned.");
    } catch (error) {
      if (error.message === "TOKEN_REFRESHED_RETRY_BOOKING") {
        // This specific error signals that a token refresh happened, and we should retry the booking action.
        // The retryAsync helper will catch this and retry.
        console.log("Token was refreshed. Retrying booking operation...");
        throw error; // Re-throw to signal retryAsync to try again.
      }
      // For other errors, they will be caught by retryAsync and handled there.
      throw error;
    }
  };

  try {
    return await retryAsync(
      bookAction,
      MAX_RETRIES, // Use the global MAX_RETRIES
      constants.FREQUENCY.SLOT_BOOKING_FREQUENCY,
      "Failed to book appointment"
    );
  } catch (error) {
    console.error(`bookAppointment ultimately failed: ${error.message}`);
    // Consider more specific error messages or logging based on the error type
    if (error.message.includes("409")) {
       console.error("This may be due to the slot being booked by someone else or invalid beneficiary details.");
    }
    throw error; // Re-throw the error to be handled by the caller
  }
};
