process.env.ir_wsdl_url = "https://www.connectwebservice.com/partybuz/services/IR?wsdl";
process.env.sqs_url = "https://sqs.eu-west-2.amazonaws.com/001419949185/pb_changed_products";

var lambda = require('./index.js');

lambda.handler(null,null, function(err, result) {
    if(result !== null) console.log(result);
    else console.log(err);
});