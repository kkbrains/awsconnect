// Get the AWS SDK and Dynamo SDKs ready
var AWS = require("aws-sdk");
var docClient = new AWS.DynamoDB.DocumentClient();
	
//Sets the timezone environment variable for the Lambda function
process.env.TZ = "America/New_York";
	
exports.handler = (event, context, callback) => {
	// set the options for the date format
	var dateOptions = { weekday: "short", year: "numeric", month: "short", day: "numeric" }; 
		
	// set the variables to record the current local date and time
	var currentShortDate = new Date().toLocaleDateString();
	var currentLongDate = new Date().toLocaleDateString("en-US", dateOptions);
	var currentTime = new Date().toLocaleTimeString("en-US");
	var currentTimeStamp = new Date().toString();
		
	//log the incoming event from Amazon Connect for troubleshooting purposes
	console.log("Received event from Amazon Connect at: " + currentTimeStamp);
	console.log("Amazon Connect Event Details: " +JSON.stringify(event));
	
	//set the variables for the customer ANI and unique contact ID
	var sourcePhoneNumber = event.Details.ContactData.CustomerEndpoint.Address;
	var currentContactId = event.Details.ContactData.ContactId;
	
	//set up the database query to be used to lookup customer information from DynamoDB
	var paramsQuery = {
	//DynamoDB Table Name.	 Replace with your table name
	TableName:'innowizConnect',
	KeyConditionExpression: "phoneNumber = :varNumber",
	IndexName: "phoneNumber-index",
	
	ExpressionAttributeValues: {
		":varNumber": sourcePhoneNumber
		}
	};
		
	//set up the database query to be used to update the customer information record in DynamoDB
	var paramsUpdate = {
	//DynamoDB Table Name.	 Replace with your table name
	TableName:'innowizConnect',
	Key:{"phoneNumber": sourcePhoneNumber},
		
	ExpressionAttributeValues:{":var1": currentTimeStamp, ":var2": currentLongDate, ":var3": currentTime, ":var4": currentContactId,	 },
		
	UpdateExpression: "SET lastCalledTimeStamp = :var1, lastCalledDate = :var2, lastCalledTime = :var3, lastCalledCallId = :var4"
	};
		
	//use the lookup query (paramsQuery) we set up to lookup the customer data based on the source phone number from DynamoDB 
	docClient.query(paramsQuery, function(err, dbResults) {
	//check to make sure the query executed correctly, if so continue, if not error out the lambda function
	if (err){
		console.log(err); // an error occurred
		context.fail (buildResponse(false));		 
	} 
	//if no error occured, proceed to process the resutls that came back from DynamoDB
	else{
		//log the results from the DynamoDB query
		console.log("DynamoDB Query Results:" + JSON.stringify(dbResults));
			
		//check to ensure only 1 record came back for the customer phone number
		if (dbResults.Items.length === 1 ){
			
		//set variables for the pertinet information from the returned database record:
			var lastCalledDate = dbResults.Items[0].lastCalledDate;
			var lastCalledTime = dbResults.Items[0].lastCalledTime;
			var customerFirstName = dbResults.Items[0].firstName;
			var customerLastName = dbResults.Items[0].lastName;
				
		//check to see if there is a record of a previous call, and set the previous call variable accordingly
		var customerFirstCall = true;
		if (lastCalledDate){
		customerFirstCall = false};
			
			//update the customer record in the database with the new call information using the paramsUpdate query we setup above:
			docClient.update(paramsUpdate, function(err, data) {
			if (err) console.log("Unable to update item. Error: ", JSON.stringify(err, null, 2));
				
			else console.log("Updated item succeeded: ", JSON.stringify(data, null, 2));
			
						});
			
					callback(null, buildResponse(true, customerFirstName, customerLastName, lastCalledDate, lastCalledTime, customerFirstCall));	 
		}		 
				
		
		else {
				
			docClient.update(paramsUpdate, function(err, data) {
			if (err) console.log("Unable to update item. Error: ", JSON.stringify(err, null, 2));
				
			else console.log("Updated item succeeded: ", JSON.stringify(data, null, 2));
			
						});
			
					callback(null, buildResponse(false, customerFirstName, customerLastName, lastCalledDate, lastCalledTime, customerFirstCall)); 
		}		 
	
		}
	});
};
	
//This is the function that will be called on errors or failures
function buildFail(isSuccess) {
	return {
	lambdaResult:"Error"
	};
}
	
//This is the function that will be called on a successful callback
function buildResponse(isSuccess, customerFirstName, customerLastName, lastCalledDate, lastCalledTime, customerFirstCall) {
	if (isSuccess){
	var results = {
	FirstName: customerFirstName,
	LastName: customerLastName,
	LastCalledDate: lastCalledDate,
	LastCalledTime: lastCalledTime,
	FirstCall: customerFirstCall,
	lambdaResult:"Success"};
	console.log("Lambda's Response to Amazon Connect is: " + JSON.stringify(results));
	return results;
	}
		
	else {
	console.log("Lambda returned error to Amazon Connect");
	var resultsfail = {
	lambdaResult:"Error"};
	return JSON.stringify(resultsfail);
	}
}