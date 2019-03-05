//delete global._bitcore;
const bitcoin_lib = require("bitcore-lib");
const paymentProtocol = require("bitcore-payment-protocol");
const express = require("express");
const bodyParser = require("body-parser");
const URI = require("bitcore-lib/lib/uri");
const request = require("request");
const https = require("https");
const fs = require("fs");
const dcert = fs.readFileSync("./keys/cert.der");
const mcert = fs.readFileSync("./keys/cert.pem");
const mkey = fs.readFileSync("./keys/key.pem");
const credentials = { key: mkey, cert: mcert };
const app = express();
const os = require("os");
const interfaces = os.networkInterfaces();
const addresses = [];
const path = require("path");
const urlencodedParser = bodyParser.urlencoded({ extended: false });


bitcore_lib.Networks.defaultNetwork = bitcore_lib.Networks.testnet;
const privateKey = bitcore_lib.PrivateKey(merchant_pkey);

publicKey = bitcore_lib.PublicKey(privateKey);

bitcore_lib.Address(publicKey, bitcore_lib.Networks.defaultNetwork);

let Merchant_address = "bc1q2xs0nusavwt3x6khrh0uj68k7en85t6z48g9gu";

for (let k in interfaces) {
  for (let k2 in interfaces[k]) {
    let address = interfaces[k][k2];
    if (address.family === "IPv4" && !address.internal) {
      addresses.push(address.address);
    }
  }
}

let IP = addresses[0];
let port = 8883;
let http_port = 3000;

app.get("/", function(req, res) {
  res.send("Bitcoin Meerchant Payment Protocol");
});

app.listen(http_port, function() {
  console.log("server running " + IP + http_port);
});

https.createServer(credentials, app).listen(port, function() {
  console.log("-https Server listening on :" + IP + ":" + port);
});

//Merchant side functions ( Payment uri handling  )

function compose_uri(amount_to_pay) {
  let pay_uri = "http://" + IP + ":" + http_port + "/request";

  let uriString = {
    address: Merchant_address,
    amount: amount_to_pay,
    message: "payment request"
  };

  let paymentUri = uriString + "&r=" + pay_url;
  return paymentUri;
}

app.use(express.static(path.join(__dirname + "/views")));
app.get("/checkout", function(req, res) {
  res.sendFile(path.join(__dirname + "/views/index.html"));
});

app.use(bodyParser.json());
app.post("/ProcessingPayment", function(req, res) {
  let amount_ = req.body.amount;
  let resp = compose_uri(amount_) + "?amount=" + amount_;
  res.send(resp);
});

app.get("/request", urlencodedParser, function(req, res) {
  let amount = req.query.amount;
  amount = amount === undefined ? 0 : amount; // set amount to 0 if undefined
  let merchant_outputs = []; // Where payment should be sent
  let outputs = new PaymentProtocol().makeOutput();
  outputs.set("amount", amount);
  let script = bitcore_lib.Script.buildPublicKeyHashOut(
    Merchant_address.toString()
  );
  outputs.set("script", script.toBuffer());
  merchant_outputs.push(outputs.message);
});

let details = new PaymentProtocol().makePaymentDetails();
let now = (Date.now() / 1000) | 0;
details.set("network", "test");
details.set("outputs", merchant_outputs);
details.set("time", now); //Unix timestamp when the PaymentRequest was created.
details.set("expires", now + 60 * 60 * 24); //timestamp after which the PaymentRequest should be considered invalid.
details.set("memo", "A payment request from the merchant.");
details.set(
  "payment_url",
  "http://" + IP + ":" + http_port + "/payment?id=12345"
); //location where a Payment message may be sent to obtain a PaymentACK.

details.set("merchant_data", new Buffer("Transaction N 12345")); //identify the payment request

let request = new PaymentProtocol().makePaymentRequest();
request.set("payment_details_version", 1);
let certificates = new PaymentProtocol().makeX509Certificates();
certificates.set("certificate", dcert);
request.set("pki_type", "x509+sha256");
request.set("pki_data", certificates.serialize());
request.set("serialized_payment_details", details.serialize());
request.sign(mkey);
let rawbody = request.serialize(); // serialize the request

res.set({
  "Content-Type": PaymentProtocol.PAYMENT_REQUEST_CONTENT_TYPE,
  "Content-Length": request.length,
  "Content-Transfer-Encoding": "binary"
});

//responses for browsers
if (req.query.browser == 1) {
  let buf = new Buffer(rawbody, "binary").toString("base64");
  res.contentType(PaymentProtocol.PAYMENT_REQUEST_CONTENT_TYPE);
  res.send(buf);
} else {
  //response for bitcoin client
  res.status(200).send(rawbody);
}

let rawBodyParser = bodyParser.raw({
  type: PaymentProtocol.PAYMENT_CONTENT_TYPE
});
app.post("/payment", rawBodyParser, function(req, res) {
  let body = PaymentProtocol.Payment.decode(req.body);
  let payment = new PaymentProtocol().makePayment(body);
  let refund_to = payment.get("refund_to"); //output where a refund should be sent.
  let memo = payment.get("memo");
  let Rawtransaction = payment.get("transactions")[0].toBuffer();
  //One or more valid, signed Bitcoin transactions that fully pay the PaymentRequest

  let TransactionToBrodcast = new bitcore_lib.Transaction(
    Rawtransaction
  ).toString("hex");
  // potentially broadcast the transaction
});

let ack = new PaymentProtocol().makePaymentACK();
ack.set("payment", payment.message);
ack.set(
  "memo",
  "Payment processed,Thank you ;) \n invoice ID :" + req.query.id
);
//store invoice details in database
let rawack = ack.serialize();
res.set({
  "Content-Type": PaymentProtocol.PAYMENT_ACK_CONTENT_TYPE,
  "Content-Length": rawack.length
});
res.send(rawack);

app.get("/invoice", urlencodedParser, function(req, res) {
  let invoice_id = req.query.id;
  let detail = "details about the invoice N:" + invoice_id; //Request details from database
  res.send(detail);
});

app.listen(http_port, function() {
  console.log("-http Server listening on :" + IP + ":" + http_port);
});

https.createServer(credentials, app).listen(port, function() {
  console.log("-https Server listening on :" + IP + ":" + port);
});

app.get("/invoice", urlencodedParser, function(req, res) {
  let invoice_id = req.query.id;
  let detail = "details about the invoice N:" + invoice_id;
  /*....invoice Database access..*/

  res.send(detail);
});
