'use strict';
 
/**
 * This code sample demonstrates an implementation of the Lex Code Hook Interface
 * in order to serve a bot which manages dentist appointments.
 * Bot, Intent, and Slot models which are compatible with this sample can be found in the Lex Console
 * as part of the 'MakeAppointment' template.
 *
 * For instructions on how to set up and test this bot, as well as additional samples,
 *  visit the Lex Getting Started documentation.
 */
  
 // --------------- Helpers to build responses which match the structure of the necessary dialog actions -----------------------
 
function elicitSlot(sessionAttributes, intentName, slots, slotToElicit, message) {
    console.log("Got to Elicit Slot Function");
    console.log("elicitSlot SessionAttributes: " +JSON.stringify(sessionAttributes));
    console.log("elicitSlot IntentName: " +JSON.stringify(intentName));
    console.log("elicitSlot Slots: " +JSON.stringify(slots));
    console.log("elicitSlot Slot to Elicit: " +JSON.stringify(slotToElicit));
    console.log("elicitSlot Message: " +JSON.stringify(message));
     
    // add to transcript 
    appendTranscript(sessionAttributes, 'Lex', message.content);
     
    return {
        sessionAttributes,
        dialogAction: {
            type: 'ElicitSlot',
            intentName,
            slots,
            slotToElicit,
            message,
         
        },
    };
}
 
function confirmIntent(sessionAttributes, intentName, slots, message) {
    // add to transcript 
    appendTranscript(sessionAttributes, 'Lex', message.content);
     
    return {
        sessionAttributes,
        dialogAction: {
            type: 'ConfirmIntent',
            intentName,
            slots,
            message,
        },
    };
}
 
function close(sessionAttributes, fulfillmentState, message) {
    // add to transcript 
    appendTranscript(sessionAttributes, 'Lex', message.content);
     
    return {
        sessionAttributes,
        dialogAction: {
            type: 'Close',
            fulfillmentState,
            message,
        },
    };
}
 
function delegate(sessionAttributes, slots) {
    return {
        sessionAttributes,
        dialogAction: {
            type: 'Delegate',
            slots,
        },
    };
}
  
 function delegate(sessionAttributes, slots) {
    return {
        sessionAttributes,
        dialogAction: {
            type: 'Delegate',
            slots,
        },
    };
}
 
// ---------------- Helper Functions --------------------------------------------------
function padDigits(digits) {
    var result = '';
    for (var i = 0; i < digits.length; i++) {
        result += digits.charAt(i) + ' ';
    }
    return result;
}
 
 
function parseLocalDate(date) {
    /**
     * Construct a date object in the local timezone by parseInt(, 10)ng the input date string, assuming a YYYY-MM-DD format.
     * Note that the Date(dateString) constructor is explicitly avoided as it may implicitly assume a UTC timezone.
     */
    const dateComponents = date.split(/\-/);
    return new Date(dateComponents[0], dateComponents[1] - 1, dateComponents[2]);
}
 
function isValidDate(date) {
    try {
        return !(isNaN(parseLocalDate(date).getTime()));
    } catch (err) {
        return false;
    }
}
 
function getTripID(tripID) {
    if (tripID == "5117" || tripID == "1234" || tripID == "1122" || tripID == "1177"){
        return true;
    }
     
    return false;
}
 
//Helper function to validate input
function buildValidationResult(isValid, violatedSlot, messageContent) {
    return {
        isValid,
        violatedSlot,
        message: { contentType: 'PlainText', content: messageContent },
    };
}
 
function validateRideStatus(tripID, tripDate, speakTripID) {
    if (tripID && !getTripID(tripID)) {
        return buildValidationResult(false, 'tripID', 'I dont seem to have a record for the trip ID of: ' +speakTripID+ '. Please try telling me your trip ID again');
    }
     
    if (tripDate) {
        if (!isValidDate(tripDate)) {
            return buildValidationResult(false, 'tripDate', 'Sorry, I did not get that, please tell me the full date.');
        }
         
    }
     
     
    return buildValidationResult(true, null, null);
}
 
 
 
// --------------- Main handler -----------------------
 
function loggingCallback(response, originalCallback) {
    console.log(JSON.stringify(response, null, 2));
    originalCallback(null, response);
}
 
// Route the incoming request based on intent.
// The JSON body of the request is provided in the event slot.
exports.handler = (event, context, callback) => {
    console.log("incoming event details: " + JSON.stringify(event));
    try {
        // By default, treat the user request as coming from the America/New_York time zone.
        process.env.TZ = 'America/New_York';
        console.log(`event.bot.name=${event.bot.name}`);
        console.log("incoming event details: " + JSON.stringify(event));
 
        //Send the request to the dispatch function
        dispatch(event, (response) => loggingCallback(response, callback));
    } catch (err) {
        callback(err);
    }
};
 
// --------------- Intents -----------------------
 
/**
 * Called when the user specifies an intent for this skill.
 */
function dispatch(intentRequest, callback) {
    // console.log(JSON.stringify(intentRequest, null, 2));
    console.log(`dispatch userId=${intentRequest.userId}, intent=${intentRequest.currentIntent.name}`);
 
    const name = intentRequest.currentIntent.name;
 
    // Dispatch to your skill's intent handlers
    if (name === 'rideStatus') {
        return rideStatus(intentRequest, callback);
    }
    throw new Error(`Intent with name ${name} not supported`);
}
 
const appendTranscript = (outputSessionAttributes, source, message, phoneNumber) => {    
    if (source !== 'Lex' && source !== 'Customer') {
        throw Error('Invalid Source: ', source);
    }
     
    var custPhoneNumber = "Lex";
    if (source == 'Customer'){
        custPhoneNumber = phoneNumber
        console.log("custPhoneNumber: " + custPhoneNumber);
    }
     
    if (source == 'Lex'){
        custPhoneNumber = source
        console.log("custPhoneNumber: " + custPhoneNumber);
    }
     
    var transcript = [];
    if (outputSessionAttributes.transcript !== undefined) {
        transcript = JSON.parse(outputSessionAttributes.transcript);
    }
 
    transcript.push(
        {
         "Participant": source, 
         "Text": message, 
         "Timestamp": new Date().toISOString(),
         "PhoneNumber": custPhoneNumber
        });
     
    outputSessionAttributes.transcript = JSON.stringify(transcript);  
};
 
// --------------- Functions that control the skill's behavior -----------------------
 
/**
 * Performs dialog management and fulfillment for booking a dentists appointment.
 *
 * Beyond fulfillment, the implementation for this intent demonstrates the following:
 *   1) Use of elicitSlot in slot validation and re-prompting
 *   2) Use of confirmIntent to support the confirmation of inferred slot values, when confirmation is required
 *      on the bot model and the inferred slot values fully specify the intent.
 */
function rideStatus(intentRequest, callback) {
    const tripID = intentRequest.currentIntent.slots.tripID;
    const tripDate = intentRequest.currentIntent.slots.tripDate;
    const source = intentRequest.invocationSource;
    const outputSessionAttributes = intentRequest.sessionAttributes || {};
    const bookingMap = JSON.parse(outputSessionAttributes.bookingMap || '{}');
    const confirmationStatus = intentRequest.currentIntent.confirmationStatus;
    const phoneNumber = intentRequest.sessionAttributes.phoneNumber;
    var speakTripID = '';
    if (tripID){
        speakTripID = padDigits(tripID);
    }
    console.log(speakTripID);
    console.log("customer phone number: " + phoneNumber);
    console.log(confirmationStatus);
     
     
    if (source === 'DialogCodeHook') {
        // Perform basic validation on the supplied input slots.
        const slots = intentRequest.currentIntent.slots;
        const validationResult = validateRideStatus(tripID, tripDate, speakTripID);
           if (!validationResult.isValid) {
            slots[`${validationResult.violatedSlot}`] = null;
            callback(elicitSlot(outputSessionAttributes, intentRequest.currentIntent.name,
            slots, validationResult.violatedSlot, validationResult.message));
     
            return;
        }
         
        // add the customer utterence
        appendTranscript(outputSessionAttributes, 'Customer', intentRequest.inputTranscript, phoneNumber);
         
        if (!tripID) {
            outputSessionAttributes.intentUtterance = intentRequest.inputTranscript;
            callback(elicitSlot(outputSessionAttributes, intentRequest.currentIntent.name,
            intentRequest.currentIntent.slots, 'tripID',
            { contentType: 'PlainText', content: 'What is the trip ID for your scheduled ride?' }));
            return;
        }
         
         
        if (tripID && !tripDate) {
            outputSessionAttributes.tripIDUtterance = intentRequest.inputTranscript;
            outputSessionAttributes.speakTripID = speakTripID;
            callback(elicitSlot(outputSessionAttributes, intentRequest.currentIntent.name,
            intentRequest.currentIntent.slots, 'tripDate',
            { contentType: 'PlainText', content: `Got it, and whats the date for your scheduled trip?` }));
            return;
        }
         
         
        if (tripID && tripDate && (confirmationStatus == "None")) {
            outputSessionAttributes.tripDateUtterance = intentRequest.inputTranscript;
            //fetch the trip details
            callback(confirmIntent(outputSessionAttributes, intentRequest.currentIntent.name, slots,
                { contentType: 'PlainText', content: `Ok, just to confirm, you would like me to look up the trip details for trip ID:  ${speakTripID}. scheduled for: ${tripDate}: Is that correct?` }));
            return;
        }
         
        if (tripID && tripDate && (confirmationStatus == "Denied")) {
            outputSessionAttributes.confirmStatus = confirmationStatus;
            console.log("user denied prompt: " + JSON.stringify(outputSessionAttributes));
            callback(close(outputSessionAttributes, 'Fulfilled', { contentType: 'PlainText', content: `Ok, let me get you to an agent who can better assist you!` }));
             
            return;
        }
         
        if (tripID && tripDate && (confirmationStatus == "Confirmed")) {
            outputSessionAttributes.confirmStatus = confirmationStatus;
            console.log("user confirmed prompt: " + JSON.stringify(outputSessionAttributes));
            callback(close(outputSessionAttributes, 'Fulfilled', { contentType: 'PlainText', content: `Ok, here you go:` }));
             
            return;
        }
         
         
        callback(delegate(outputSessionAttributes, slots));
        return;
    }
}
         
        