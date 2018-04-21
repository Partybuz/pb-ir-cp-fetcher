"use strict";

// Load the SDK for JavaScript
var AWS = require('aws-sdk');
// Set the region 
AWS.config.update({region: 'eu-west-2'});

// Create an SQS service object
var sqs = new AWS.SQS({apiVersion: '2012-11-05'});

var cw = new AWS.CloudWatch({apiVersion: '2010-08-01'});

const soap = require('strong-soap').soap;

const ir_wsdl_url = process.env.ir_wsdl_url;
const sqs_url = process.env.sqs_url;

exports.handler = (event, context, callback) => {
  try {
      soap.createClient(ir_wsdl_url, [], function(err, client) {
          if(err) throw err;
          let timeString = getUkDateTimeStringFromHoursAgo(28);
          console.log("Fetching changed products since "+timeString);
          getProductIds(client, timeString, function(productIds) {
            if(productIds.length) {
                console.log("Got "+productIds.length+" products.  Fetching data...");
              for(let id of productIds) {
                sqs.sendMessage({
                  MessageBody: id,
                  QueueUrl: sqs_url
                }, function(err, data) {
                  if (err) {
                    console.log("Error", err);
                  } else {
                    console.log("Success", data.MessageId);
                  }
                });
              }
            } else {
              console.log("No products to update.");
            }
            //[now lets send a metric to cloudwatch]
            // Create parameters JSON for putMetricData
            var params = {
              MetricData: [
                {
                  MetricName: 'Changed Products Found',
                  Unit: 'None',
                  Value:  productIds.length
                },
              ],
              Namespace: 'PartyBuz/ProductSync'
            };

            cw.putMetricData(params, function(err, data) {
              if (err) {
                console.log("Error sending metric data", err);
              }
            });
            callback(null, productIds.length);
          });
      });
  } catch (err) {
          callback("Caught error (internal): "+err);
  }
};

function getProductIds(client, date_string, callback) {
  makeCall(client, 'getProductIdsChangedSinceDateStrForType',{
    lastRequestDateStr: date_string,
    leafOnly: false
  }, function(result) {
        callback(result ? result.split(',') : []);
  });
}

function makeCall(client, methodName, params, callback) {
  client[methodName](params, function(err, result, envelope, soapHeader) {
        //response envelope
        if(err) {
          console.log('Error: \n' + err);
          throw err;
        }
        
    //response envelope
    //console.log('Response Envelope: \n' + envelope);
    //'result' is the response body
    //console.log('Result: \n' + JSON.stringify(result));
    callback(result[methodName+'Return']);
  });
}

String.prototype.paddingLeft = function (paddingValue) {
  return String(paddingValue + this).slice(-paddingValue.length);
};

function getUkDateTimeStringFromHoursAgo(hoursAgo) {
  let dt = new Date(new Date().getTime() - (hoursAgo * 60 * 60 * 1000));
  return dt.getDate().toString().paddingLeft('00')+'/'+(dt.getMonth()+1).toString().paddingLeft('00')+'/'+dt.getFullYear()+' '+dt.getHours().toString().paddingLeft('00')+':'+dt.getMinutes().toString().paddingLeft('00');
}