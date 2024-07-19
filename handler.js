const DynamoDB = require('aws-sdk/clients/dynamodb');
const { v4: uuidv4 } = require('uuid');
const documentClient = new DynamoDB.DocumentClient({
    region: 'us-east-1', // Specify the AWS region.
    maxRetries: 3,
    httpOptions: {
        timeout: 5000,
    },
});
// Get the name of the DynamoDB table from an environment variable.
const NOTES_TABLE_NAME = process.env.NOTES_TABLE_NAME;
// Helper function to format and send responses.
const send = (statusCode, message) => {
    return {
        statusCode: statusCode,
        body: JSON.stringify(message),
    };
}

module.exports = {
    createNote: async function (event, context, cb) {
        context.callbackWaitsForEmptyEventLoop = false;
        try {
            const data = JSON.parse(event.body); // Parse the request body JSON.
            const params = {
                TableName: NOTES_TABLE_NAME,
                Item: {
                    notesId: uuidv4(),
                    timestamp: Date.now(),
                    title: data.title,
                    body: data.body,
                },
                ConditionExpression: 'attribute_not_exists(notesId)', // Prevent overwriting existing notes.
            };
            await documentClient.put(params).promise(); // Add the new note to DynamoDB.
            console.log("Added to DB !!");
            cb(null, send(200, params.Item)); // Send a success response.
        } catch (error) {
            console.log("Error occured while adding item: ", error);
            cb(null, send(500, error.message)); // Send an error response.
        }
    },
    updateNote: async (event, context, cb) => {

        context.callbackWaitsForEmptyEventLoop = false;
        try {
            const id = event.pathParameters.id;
            const data = JSON.parse(event.body);
            const params = {
                TableName: NOTES_TABLE_NAME,
                Key: {
                    notesId: id,
                },
                UpdateExpression: 'set #title = :title, #body = :body',
                ExpressionAttributeNames: {
                    '#title': 'title',
                    '#body': 'body',
                },
                ExpressionAttributeValues: {
                    ':title': data.title,
                    ':body': data.body,
                },
                ConditionExpression: 'attribute_exists(notesId)',
            };
            await documentClient.update(params).promise();
            cb(null, send(200, "Note Updated"));
        } catch (error) {
            cb(null, send(500, error.message));
        }
    },
    getAllNotes: async (event, context, cb) => {
        context.callbackWaitsForEmptyEventLoop = false;
        try {
            const params = {
                TableName: NOTES_TABLE_NAME,
            };
            const data = await documentClient.scan(params).promise();
            cb(null, send(200, data.Items));
        } catch (error) {
            cb(null, send(500, error.message));
        }
    },
    deleteNote: async (event, context, cb) => {

        context.callbackWaitsForEmptyEventLoop = false;
        try {
            const id = event.pathParameters.id;
            const params = {
                TableName: NOTES_TABLE_NAME,
                Key: {
                    notesId: id,
                },
                ConditionExpression: 'attribute_exists(notesId)',
            };
            await documentClient.delete(params).promise();
            cb(null, send(200, "Note deleted"));
        } catch (error) {
            cb(null, send(500, error.message));
        }
    }
}