// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.getAllUsers = functions.https.onCall(async (data, context) => {
  // Check if the user is authenticated (optional)
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be signed in to call this function.');
  }

  const userRecords = [];
  let nextPageToken;

  try {
    do {
      const result = await admin.auth().listUsers(1000, nextPageToken);
      userRecords.push(...result.users);
      nextPageToken = result.pageToken;
    } while (nextPageToken);

    return { users: userRecords };
  } catch (error) {
    console.error("Error listing users:", error);
    throw new functions.https.HttpsError('internal', 'Unable to list users.');
  }
});
