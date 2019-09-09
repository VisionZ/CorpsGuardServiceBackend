require('dotenv').config();

var plivo = require('plivo');
var nodemailer = require('nodemailer');
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const SENDER_EMAIL = process.env.SENDER_EMAIL;
const RECEIVER_EMAIL = process.env.RECEIVER_EMAIL;
const ID = process.env.ID;
const SECRET = process.env.SECRET;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

const GUARD_ROOM_PHONES = process.env.GUARD_ROOM_PHONES.split(",");

function isString(str) {
    return typeof str === "string" || str instanceof String;
}

function isNumeric(num) {
    return !isNaN(parseFloat(num)) && isFinite(num);
}

function getCurrentUTCTime() {
    var date = new Date();

    function formatDateField(dateField) {
        return (dateField < 10) ? "0" + dateField : dateField;
    }

    var month = formatDateField(date.getUTCMonth() + 1);
    var dayOfMonth = formatDateField(date.getUTCDate());
    var year = date.getUTCFullYear();

    var hour = formatDateField(date.getUTCHours());
    var minute = formatDateField(date.getUTCMinutes());
    var second = formatDateField(date.getUTCSeconds());

    return month + "/" + dayOfMonth + "/" + year + " " + hour + ":" + minute + ":" + second;
}

function sendSMS(client, destinationPhone, text) {
    client.messages.create(
        null, //from
        destinationPhone, // to
        text,
        {
            method: "GET",
            url: "http://foo.com/sms_status/",
            log: "true",
            type: "sms"
        },
        process.env.POWER_PACK_UUID //powerpack_uuid
    ).then(function (response) {
        console.log("Message UUID: " + response.messageUuid);
        console.log("Response:");
        console.log(response);
    });
}

module.exports = async function (context, queryRequest) {
    let query = queryRequest.query;
    var client = new plivo.Client(process.env.AUTH_ID, process.env.AUTH_TOKEN);

    context.log("Query Parameters:");
    context.log(JSON.stringify(query));
    context.log();

    let firstName = query["fname"];
    let lastName = query["lname"];
    let wholeName = firstName + " " + lastName;
    let phone = query["phone"];

    let UIN = query["uin"];
    let email = query["email"];
    let requesterPhone = query["rphone"];

    //Determine if we are handling a response from a Corps member
    if (isString(UIN) && isString(email) && isString(requesterPhone)) {

        const requestResponse =
            "Corps Escorter Contact Info:"
            + "\n"
            + "First Name: " + firstName
            + "\n"
            + "Last Name: " + lastName
            + "\n"
            + "UIN: " + UIN
            + "\n"
            + "Phone: " + phone
            + "\n"
            + "Email: " + email;

        sendSMS(client, requesterPhone, requestResponse);

        context.res = {
            status: 200,
            body: "Sent message to requester."
        }
    }

    let currentLatitude = query["currentlat"];
    let currentLongitude = query["currentlong"];
    let destinationLatitude = query["destlat"];
    let destinationLongitude = query["destlong"];

    if (isString(firstName) && isString(lastName) && isString(phone)
        && isString(currentLatitude)
        && isString(currentLongitude)
        && isString(destinationLatitude)
        && isString(destinationLongitude)) {

        if (isNumeric(currentLatitude) && isNumeric(currentLongitude) && isNumeric(destinationLatitude) && isNumeric(destinationLongitude)) {
            currentLatitude = parseFloat(currentLatitude);
            currentLongitude = parseFloat(currentLongitude);
            const currentPosition = currentLatitude + "," + currentLongitude;

            destinationLatitude = parseFloat(destinationLatitude);
            destinationLongitude = parseFloat(destinationLongitude);
            const destinationPosition = destinationLatitude + "," + destinationLongitude;

            //TO DO: Send 3 Images, 1 zooming in on Point A, 1 zooming in on Point B, and this one
            const baseAddress = "https://maps.googleapis.com/maps/api/staticmap";
            const center = ((currentLatitude + destinationLatitude) / 2.0) + "," + ((currentLongitude + destinationLongitude) / 2.0);
            const zoom = "zoom=15";
            const size = "size=800x600";
            const mapType = "maptype=street";
            const startMarker = "markers=color:green%7Clabel:A%7C" + currentPosition;
            const endMarker = "markers=color:red%7Clabel:B%7C" + destinationPosition
            const key = "key=" + GOOGLE_MAPS_API_KEY;

            const imageURL = baseAddress + "?" + center + "&" + size + "&" + mapType + "&" + startMarker + "&" + endMarker + "&" + key;
            context.log("Image URL: " + imageURL);

            let rawDataText = "First Name: " + firstName + "\n" + "Last Name: " + lastName + "\n" + "Phone Number: " + phone;

            const oauth2Client = new OAuth2(
                ID,
                SECRET,
                "https://developers.google.com/oauthplayground" // Redirect URL
            );
            oauth2Client.setCredentials({
                refresh_token: REFRESH_TOKEN
            });
            const accessToken = oauth2Client.getAccessToken()

            const transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    type: "OAuth2",
                    user: SENDER_EMAIL,
                    clientId: ID,
                    clientSecret: SECRET,
                    refreshToken: REFRESH_TOKEN,
                    accessToken: accessToken
                }
            });

            var mailOptions = {
                from: SENDER_EMAIL,
                to: RECEIVER_EMAIL,
                subject: 'Escort Request from ' + wholeName,
                text: rawDataText,
                //Attach a static picture from Google Maps
                attachments: [
                    {
                        filename: wholeName + ' Escort Request.png',
                        path: imageURL
                    }
                ]
            };

            //Send escort request to Guard Room email server
            transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                    context.log("Failed to send email: " + error);
                } else {
                    context.log('Email sent: ' + info.response);
                    //Notify client that there request has been properly received.
                    sendSMS(client, phone, "Your escort request has been received!" + "\n" + "UTC Timestamp: " + getCurrentUTCTime());
                }
            });

            //Send escort request to all Corps members in the Guard Room
            for (let index = 0, length = GUARD_ROOM_PHONES.length; index < length; ++index) {
                sendSMS(client, GUARD_ROOM_PHONES[index], rawDataText + "\n" + "View Escort Request: " + imageURL);
            }

            //if sending to email and sms works we can send another
            //sms to the requester telling them that their request has been 
            //recieved
            context.res = {
                status: 200,
                body: "Request Successful!"
            };

            return;
        }
    }
    context.res = {
        status: 400,
        body: "Request Failed!"
    };
};