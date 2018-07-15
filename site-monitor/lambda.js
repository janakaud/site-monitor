let AWS = require('aws-sdk');
const ses = new AWS.SES();
const ddb = new AWS.DynamoDB.DocumentClient();
const request = require("request");

exports.handler = function (event, context, callback) {
    request.get("http://www.my-favorite-site.com",
        (error, response, body) => {
            if (!body) {
                throw new Error("Failed to fetch homepage!");
            }

            let urls = body.match(/(lp|\?r=specialTopic)\/[^"]*/);
            if (!urls) { // nothing found; no point in proceeding
                return;
            }
            let url = urls[0];

            ddb.get({
                TableName: 'site-data',
                Key: { 'domain': 'my-favorite-site.com' }
            }, function (err, data) {
                if (err) {
                    throw err;
                } else {
                    if (!data.Item || data.Item.url != url) {
                        ses.sendEmail({
                            Destination: {
                                ToAddresses: ['janakaud@gmail.com'],
                                CcAddresses: [],
                                BccAddresses: []
                            },
                            Message: {
                                Body: {
                                    Text: {
                                        Data: url
                                    }
                                },
                                Subject: {
                                    Data: 'MyFavSite Update!'
                                }
                            },
                            Source: 'janakaud@gmail.com',
                        }, function (err, data) {
                            if (err) {
                                throw err;
                            }
                            ddb.put({
                                TableName: 'site-data',
                                Item: { 'domain': 'my-favorite-site.com', 'url': url }
                            }, function (err, data) {
                                if (err) {
                                    throw err;
                                } else {
                                    console.log("New URL saved successfully!");
                                }
                            });
                        });
                    } else {
                        console.log("URL already sent out; ignoring");
                    }
                }
            });
        });

    callback(null, 'Successfully executed');
}