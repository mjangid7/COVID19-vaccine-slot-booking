# COVID19-vaccine-slot-booking
This system is designed with the intend to automate the booking of vaccine slots on cowin

### Few key points to focus on here:
1. You need to have node js installed on your system.
2. This system is used to book slot prior to your target date.
3. You must know the time at which your slots will be available.
4. If you are running it for the first time then you need to install all the dependencies listed in package.json file.
5. To install all the dependencies, run "npm install". Note: "-g" is generally not recommended for project dependencies.
6. Start the system 2-3 minutes in advance before your target time.
7. To trigger the system, you must run "node booking.js" in the command prompt.
8. Cancel Appointment and Rescheduling an existing appointment will be added later on.

### Refactoring and Improvements
- The codebase has been significantly refactored to use modern JavaScript (ES6+) features, including `async/await` for handling asynchronous operations, replacing traditional Promise chains.
- Dependencies, such as `axios`, have been updated to their latest stable versions.
- Error handling has been standardized and improved, with more robust retry logic implemented for API calls to handle transient network issues or rate limiting.

### Running Tests
Unit tests have been added to ensure code quality and reliability. To run the unit tests, use the following command:
```bash
npm test
```
