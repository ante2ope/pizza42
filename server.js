const express = require("express");
const { auth } = require("express-oauth2-jwt-bearer");
const { join } = require("path");
const authConfig = require("./auth_config.json");
var ManagementClient = require('auth0').ManagementClient;
let management = null;
var util = require('util')
var axios = require("axios").default;

let mgmtConfig = {  
  "audience": `https://${authConfig.domain}/api/v2/`,
  "secret": "yoVJFKpvL4qhEo9JSZAF0R3pVbCUvZN3gZhV46LoZ-3WLt6h-WaYbciWkltf-ukh",
  "clientid": "T1gik3JvF1xPEnWJAPebelp5UmflM2Hd"
}

const app = express();
const port = process.env.PORT || 3000;

// Serve static assets from the /public folder
app.use(express.static(join(__dirname, "public")));
app.use(express.urlencoded({extended: true}));
app.use(express.json()) // To parse the incoming requests with JSON payloads

const { requiredScopes } = require('express-oauth2-jwt-bearer');

const checkScopes = requiredScopes('read:messages');

// create the JWT middleware
const checkJwt = auth({
  audience: authConfig.audience,
  issuerBaseURL: `https://${authConfig.domain}`
});

app.post("/api/updateUserProfile", checkJwt, function(req, res) {
/*
  var options = {
    method: 'POST',
    url: `https://${authConfig.domain}}/api/v2/users`,
    headers: {authorization: `Bearer ${token}`, 'content-type': 'application/json'},
    data: {
      email: 'jane.doe@example.com',
      user_metadata: {hobby: 'surfing'},
      app_metadata: {plan: 'full'}
    }
  };
  
  axios.request(options).then(function (response) {
    console.log(response.data);
  }).catch(function (error) {
    console.error(error);
  });
*/
  /*
  var management = new ManagementClient({
    token: auth0.accessToken,
    domain: auth0.domain
  });
  */

  var mgmt = new ManagementClient({
    domain: authConfig.domain,
    clientId: mgmtConfig.clientid,
    clientSecret: mgmtConfig.secret,
    scope: "read:users update:users",
    audience: mgmtConfig.audience,
    tokenProvider: {
     enableCache: true,
     cacheTTLInSeconds: 10
    }
  });

  console.log("TEST: " + util.inspect(req.body));
  //console.log("TEST: " + util.inspect(res.body.orders));

  /*
  
  mgmt.users.updateUserMetadata(req.body.params.id, req.body.metadata.orders)
    .then(function () {
      res.send({
        msg: "this is my response to you!"
      });
    })
    .catch(function (err) {
      // Handle error.
      res.send({
        msg: "There was a problem updating your order status." + JSON.stringify(err)
      });
  });
  */
  
  mgmt.users.updateUserMetadata(req.body.params.id, req.body.metadata.orders, function (err, user) {
    if (err) {
      // Handle error.
      res.send({
        msg: "There was a problem updating your order status." + JSON.stringify(err)
      });
    }

    res.send({
      msg: "this is my response to you!"
    })
  
    // Updated user.
    console.log(user);
  });
  
});

// Endpoint to serve the configuration file
app.get("/auth_config.json", (req, res) => {
  res.sendFile(join(__dirname, "auth_config.json"));
});

app.get("/api/external", checkJwt, (req, res) => {
  res.send({
    msg: "Your access token was successfully validated!"
  });
});

// Serve the index page for all other requests
app.get("/*", (_, res) => {
  res.sendFile(join(__dirname, "index.html"));
});

app.use(function(err, req, res, next) {
  if (err.name === "UnauthorizedError") {
    return res.status(401).send({ msg: "Invalid token" });
  }

  next(err, req, res);
});

// Listen on port 3000
app.listen(port, () => console.log("Application running on port 3000"));

module.exports = app;