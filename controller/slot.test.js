// controller/slot.test.js
const slotController = require('./slot');
const axios = require('axios');
const util = require('../utils');
const userLogin = require('./login'); // Mocked as user
const constants = require('../constants');
const captcha = require('./captcha');
const preferenceUtil = require('./preferences'); // Assuming this is the correct path and usage

// Mocking dependencies
jest.mock('axios');
jest.mock('../utils');
jest.mock('./login'); // For generteNewToken
jest.mock('../constants', () => ({ // Deep mock constants if needed, or provide specific values
    CHARGE_CODE: { PAID: 'Paid', FREE: 'Free' },
    FREQUENCY: {
        SLOT_FINDING_FREQUENCY: 100, // Use small values for tests
        SLOT_BOOKING_FREQUENCY: 100,
    },
    // Add any other constants used by slot.js
}));
jest.mock('./captcha');
jest.mock('./preferences');


describe('Slot Controller', () => {
    beforeEach(() => {
        // Reset all mocks before each test
        axios.get.mockReset();
        axios.post.mockReset();
        util.getPincode.mockReset();
        util.getVaccine.mockReset();
        util.readToken.mockReset().mockReturnValue('test_token'); // Default mock token
        util.updateToken.mockReset();
        util.getAge.mockReset();
        util.getDoseAvailability.mockReset();
        util.getAddress.mockReset();
        util.getVaccineCharge.mockReset();
        util.getChargeType.mockReset();


        userLogin.generteNewToken.mockReset();
        captcha.getCaptcha.mockReset();
        
        // Mock preferenceUtil functions if they are used by slot.js
        // e.g., preferenceUtil.someFunction.mockReset();
    });

    // --- Tests for getCentersByPin ---
    describe('getCentersByPin', () => {
        const mockPreference = { pincode: '110011', vaccine: 'COVISHIELD' };
        const mockDate = '01-01-2025';

        beforeEach(() => {
            util.getPincode.mockReturnValue(mockPreference.pincode);
            util.getVaccine.mockReturnValue(mockPreference.vaccine);
        });

        it('should fetch and parse centers successfully', async () => {
            const mockApiResponse = { centers: [{ center_id: 1, name: 'Center 1', sessions: [{ session_id: 's1', available_capacity_dose1: 10, vaccine: 'COVISHIELD', min_age_limit: 18, date: mockDate, slots: ['10:00-11:00'] }] }] };
            axios.get.mockResolvedValue({ status: 200, data: mockApiResponse });
            
            // Mocking for parseCenters and filterSessions (simplified)
            // parseCenters and filterSessions are internal, so we test their effect.
            // We assume filterSessions will be called and use its mock to return something.
            // For a more direct test of getCentersByPin, we'd need to control what parseCenters and filterSessions do.
            // Let's assume parseCenters transforms data and filterSessions filters it.
            // We'll mock the utils that filterSessions uses.
            util.getVaccine.mockReturnValue(mockPreference.vaccine);
            util.getChargeType.mockReturnValue('Free'); // Example
            util.getAge.mockReturnValue(30); // Example
            util.getDoseAvailability.mockReturnValue(5); // Example
            util.getAddress.mockReturnValue("Test Address");


            const result = await slotController.getCentersByPin(mockDate, mockPreference);
            expect(axios.get).toHaveBeenCalled();
            expect(result).toEqual(expect.any(Array)); // Check if it returns an array (parsed and filtered)
            // More specific assertions can be added based on the expected output of parseCenters/filterSessions
        });

        it('should handle 401, refresh token, and retry', async () => {
            axios.get.mockResolvedValueOnce({ status: 401, response: { status: 401 } }); // Initial 401 error
            userLogin.generteNewToken.mockResolvedValue('new_test_token');
            
            const mockApiResponse = { centers: [{ center_id: 2, name: 'Center 2' }] };
            axios.get.mockResolvedValueOnce({ status: 200, data: mockApiResponse }); // Success on retry

            await slotController.getCentersByPin(mockDate, mockPreference);

            expect(userLogin.generteNewToken).toHaveBeenCalledTimes(1);
            expect(util.updateToken).toHaveBeenCalledWith('new_test_token');
            expect(axios.get).toHaveBeenCalledTimes(2); // Initial call + retry
        });


        it('should throw error on 429 (rate limit)', async () => {
            axios.get.mockRejectedValue({ response: { status: 429, headers: { 'retry-after': '60' } } });
            await expect(slotController.getCentersByPin(mockDate, mockPreference))
                .rejects.toThrow(/Too many requests \(429\)/);
        });

        it('should throw error on other API errors', async () => {
            axios.get.mockRejectedValue({ response: { status: 500, statusText: 'Server Error' } });
            await expect(slotController.getCentersByPin(mockDate, mockPreference))
                .rejects.toThrow(/Server responded with status 500/);
        });
    });

    // --- Tests for getCentersByDistrict (similar to getCentersByPin) ---
    describe('getCentersByDistrict', () => {
        const mockPreference = { district: { code: 'D1', DISTRICT: 'Test District' }, vaccine: 'COVAXIN' };
        const mockDate = '01-01-2025';

        beforeEach(() => {
            util.getVaccine.mockReturnValue(mockPreference.vaccine);
            // preference.district.code and preference.district.DISTRICT are accessed directly
        });

        it('should fetch and parse centers successfully by district', async () => {
            const mockApiResponse = { centers: [{ center_id: 3, name: 'District Center' }] };
            axios.get.mockResolvedValue({ status: 200, data: mockApiResponse });
            
            util.getChargeType.mockReturnValue('Paid'); 
            util.getAge.mockReturnValue(45); 
            util.getDoseAvailability.mockReturnValue(10);
            util.getAddress.mockReturnValue("District Address");


            const result = await slotController.getCentersByDistrict(mockDate, mockPreference);
            expect(axios.get).toHaveBeenCalled();
            expect(result).toEqual(expect.any(Array));
        });
         it('should handle 401, refresh token, and retry for district search', async () => {
            axios.get.mockRejectedValueOnce({ response: { status: 401 } }); // Initial 401 error
            userLogin.generteNewToken.mockResolvedValue('new_district_token');
            
            const mockApiResponse = { centers: [{ center_id: 4, name: 'District Center Retry' }] };
            axios.get.mockResolvedValueOnce({ status: 200, data: mockApiResponse }); // Success on retry

            await slotController.getCentersByDistrict(mockDate, mockPreference);

            expect(userLogin.generteNewToken).toHaveBeenCalledTimes(1);
            expect(util.updateToken).toHaveBeenCalledWith('new_district_token');
            expect(axios.get).toHaveBeenCalledTimes(2);
        });
    });

    // --- Tests for findSlotsByPin ---
    describe('findSlotsByPin', () => {
        const mockPreference = { pincode: '110022' };
        const mockDate = '02-01-2025';
        const mockSessions = [{ session_id: 's2', available_capacity: 5 }];

        it('should find slots on the first try', async () => {
            // Mock getCentersByPin to return sessions immediately
            jest.spyOn(slotController, 'getCentersByPin').mockResolvedValueOnce(mockSessions);
            
            const result = await slotController.findSlotsByPin(mockDate, mockPreference);
            expect(result).toEqual(mockSessions);
            expect(slotController.getCentersByPin).toHaveBeenCalledTimes(1);
        });

        it('should find slots after a few retries', async () => {
            jest.spyOn(slotController, 'getCentersByPin')
                .mockResolvedValueOnce([]) // First try: no slots
                .mockResolvedValueOnce([]) // Second try: no slots
                .mockResolvedValueOnce(mockSessions); // Third try: slots found
            
            const result = await slotController.findSlotsByPin(mockDate, mockPreference);
            expect(result).toEqual(mockSessions);
            expect(slotController.getCentersByPin).toHaveBeenCalledTimes(3);
        });

        it('should throw error after max retries if no slots found', async () => {
            // Mock getCentersByPin to always return no slots
            jest.spyOn(slotController, 'getCentersByPin').mockResolvedValue([]);
            
            await expect(slotController.findSlotsByPin(mockDate, mockPreference))
                .rejects.toThrow(/Failed to find slots by Pin after 5 attempts/);
            expect(slotController.getCentersByPin).toHaveBeenCalledTimes(5); // MAX_RETRIES is 5 in slot.js
        });
    });
    
    // --- Tests for findSlotsByDistrict (similar to findSlotsByPin) ---
     describe('findSlotsByDistrict', () => {
        const mockPreference = { district: { code: 'D2' } };
        const mockDate = '03-01-2025';
        const mockSessions = [{ session_id: 's3', available_capacity: 10 }];

        it('should find slots on the first try', async () => {
            jest.spyOn(slotController, 'getCentersByDistrict').mockResolvedValueOnce(mockSessions);
            const result = await slotController.findSlotsByDistrict(mockDate, mockPreference);
            expect(result).toEqual(mockSessions);
            expect(slotController.getCentersByDistrict).toHaveBeenCalledTimes(1);
        });

        it('should throw error after max retries if no slots found by district', async () => {
            jest.spyOn(slotController, 'getCentersByDistrict').mockResolvedValue([]);
            await expect(slotController.findSlotsByDistrict(mockDate, mockPreference))
                .rejects.toThrow(/Failed to find slots by District after 5 attempts/);
            expect(slotController.getCentersByDistrict).toHaveBeenCalledTimes(5);
        });
    });


    // --- Tests for bookSlot ---
    describe('bookSlot', () => {
        const mockSession = { session_id: 's4', center_id: 'c1', slots: ['10:00-11:00'] };
        const mockPreference = { dose: 1, beneficiary: 'beneficiary_id' };
        const mockCaptcha = 'captcha123';

        it('should book slot successfully', async () => {
            const mockBookingResponse = { appointment_confirmation_no: 'confirm123' };
            axios.post.mockResolvedValue({ status: 200, data: mockBookingResponse });

            const result = await slotController.bookSlot(mockSession, mockPreference, mockCaptcha);
            expect(axios.post).toHaveBeenCalled();
            expect(result).toEqual(mockBookingResponse);
        });

        it('should throw TOKEN_REFRESHED_RETRY_BOOKING on 401', async () => {
            axios.post.mockRejectedValueOnce({ response: { status: 401 } });
            userLogin.generteNewToken.mockResolvedValue('refreshed_token_for_booking');

            await expect(slotController.bookSlot(mockSession, mockPreference, mockCaptcha))
                .rejects.toThrow('TOKEN_REFRESHED_RETRY_BOOKING');
            expect(userLogin.generteNewToken).toHaveBeenCalledTimes(1);
            expect(util.updateToken).toHaveBeenCalledWith('refreshed_token_for_booking');
        });

        it('should throw error on 409 (Conflict)', async () => {
            axios.post.mockRejectedValue({ response: { status: 409, data: { error: 'Slot booked' } } });
            await expect(slotController.bookSlot(mockSession, mockPreference, mockCaptcha))
                .rejects.toThrow(/Booking failed: Slot booked \(Status 409\)/);
        });
        
        it('should throw error on 429 (Rate Limit)', async () => {
            axios.post.mockRejectedValue({ response: { status: 429, headers: {'retry-after': '30'} } });
            await expect(slotController.bookSlot(mockSession, mockPreference, mockCaptcha))
                .rejects.toThrow(/Too many requests \(429\) during booking/);
        });
    });

    // --- Tests for bookAppointment ---
    describe('bookAppointment', () => {
        const mockSession = { session_id: 's5' };
        const mockPreference = { dose: 2 };
        const mockConfirmationNo = 'confirmNo789';

        it('should book appointment on first try', async () => {
            captcha.getCaptcha.mockResolvedValue('captcha_val');
            // Mock bookSlot to succeed
            jest.spyOn(slotController, 'bookSlot').mockResolvedValueOnce({ appointment_confirmation_no: mockConfirmationNo });

            const result = await slotController.bookAppointment(mockSession, mockPreference);
            expect(result).toBe(mockConfirmationNo);
            expect(captcha.getCaptcha).toHaveBeenCalledTimes(1);
            expect(slotController.bookSlot).toHaveBeenCalledTimes(1);
        });

        it('should book appointment after a token refresh retry', async () => {
            captcha.getCaptcha.mockResolvedValue('captcha_val_retry');
            jest.spyOn(slotController, 'bookSlot')
                .mockRejectedValueOnce(new Error('TOKEN_REFRESHED_RETRY_BOOKING')) // First call to bookSlot: token refresh
                .mockResolvedValueOnce({ appointment_confirmation_no: mockConfirmationNo }); // Second call: success

            const result = await slotController.bookAppointment(mockSession, mockPreference);
            expect(result).toBe(mockConfirmationNo);
            expect(captcha.getCaptcha).toHaveBeenCalledTimes(2); // Called for each attempt by bookAction
            expect(slotController.bookSlot).toHaveBeenCalledTimes(2);
        });
        
        it('should throw error after max retries for booking', async () => {
            captcha.getCaptcha.mockResolvedValue('captcha_fail');
            jest.spyOn(slotController, 'bookSlot').mockRejectedValue(new Error('Persistent booking error'));

            await expect(slotController.bookAppointment(mockSession, mockPreference))
                .rejects.toThrow(/Failed to book appointment after 5 attempts/);
            expect(slotController.bookSlot).toHaveBeenCalledTimes(5); // MAX_RETRIES
        });
    });
    
    // --- Tests for parseCenters ---
    // parseCenters is not exported, so it's tested implicitly via getCentersByPin/District.
    // For direct testing, it would need to be exported or tested via a more complex setup.
    // We can test its logic by providing a sample API response to getCentersByPin/District
    // and verifying the structure of the returned sessions if filterSessions is very permissive.
    
    // --- Tests for filterSessions ---
    // filterSessions is also not exported. Tested implicitly.
    // To test its logic directly, one would need to export it.
    // Alternatively, one could craft specific inputs to getCentersBy... and mock utils
    // to ensure specific paths in filterSessions are taken, then check the output.
    // For example, to test age filtering:
    // 1. Call getCentersByPin with a center that has sessions for various age limits.
    // 2. Mock util.getAge(preference.year) to return a specific age.
    // 3. Assert that only sessions matching the age criteria are returned.
    
    describe('Implicit tests for parseCenters and filterSessions via getCentersByPin', () => {
        const mockPreference = { pincode: '110011', vaccine: 'COVISHIELD', year: 1990, dose: '1', charge: 'Free' }; // Add all required preference fields
        const mockDate = '01-01-2025';

        beforeEach(() => {
            util.getPincode.mockReturnValue(mockPreference.pincode);
            util.getVaccine.mockImplementation((pref) => pref.vaccine); // Use actual pref value
            util.getChargeType.mockImplementation((pref) => pref.charge); // Use actual pref value
            util.getAge.mockImplementation((year) => new Date().getFullYear() - year); // Approx age
            util.getDoseAvailability.mockImplementation((session, pref) => {
                return pref.dose === '1' ? session.available_capacity_dose1 : session.available_capacity_dose2;
            });
            util.getAddress.mockImplementation(center => `${center.name} Address, ${center.pincode}`);
            util.readToken.mockReturnValue('test_token_filter_parse');
        });

        it('should correctly parse and filter centers based on preferences', async () => {
            const apiResponse = {
                centers: [
                    { 
                        center_id: 1, name: 'Center A', fee_type: 'Free', pincode: '110011',
                        sessions: [
                            { session_id: 'sA1', vaccine: 'COVISHIELD', min_age_limit: 18, date: mockDate, available_capacity_dose1: 5, available_capacity_dose2: 0, slots: ['10:00'] },
                            { session_id: 'sA2', vaccine: 'COVAXIN', min_age_limit: 18, date: mockDate, available_capacity_dose1: 10, available_capacity_dose2: 0, slots: ['11:00'] } 
                        ]
                    },
                    {
                        center_id: 2, name: 'Center B', fee_type: 'Paid', pincode: '110011',
                        sessions: [
                             { session_id: 'sB1', vaccine: 'COVISHIELD', min_age_limit: 45, date: mockDate, available_capacity_dose1: 3, available_capacity_dose2: 0, slots: ['12:00'] }
                        ]
                    },
                     { // Should be filtered out by vaccine type
                        center_id: 3, name: 'Center C', fee_type: 'Free', pincode: '110011',
                        sessions: [
                             { session_id: 'sC1', vaccine: 'SPUTNIK', min_age_limit: 18, date: mockDate, available_capacity_dose1: 7, available_capacity_dose2: 0, slots: ['13:00'] }
                        ]
                    }
                ]
            };
            axios.get.mockResolvedValue({ status: 200, data: apiResponse });

            const result = await slotController.getCentersByPin(mockDate, mockPreference);
            
            expect(result).toHaveLength(1); // Only sA1 should match all criteria
            expect(result[0].session_id).toBe('sA1');
            expect(result[0].name).toBe('Center A');
            expect(result[0].vaccine).toBe('COVISHIELD');
            expect(result[0].min_age).toBe(18);
            expect(result[0].charge_type).toBe('Free');
            // util.getAge(1990) would be > 18, so min_age_limit 18 is fine.
            // util.getDoseAvailability for dose 1 on sA1 is 5, which is > 0.
        });
    });

});
