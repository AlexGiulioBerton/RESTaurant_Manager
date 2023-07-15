/**
 * HTTP REST server + MongoDB + Express
 * 
 * The following APIs are fully stateless and conform to the REST guidelines.
 * For further information see the API documentation file.
 * 
 * 
 * 
 *      Endpoints                   Attributes           Method           Description
 *  
 *          /                           _                 GET             Returns the version and a list of available endpoints
 *       /orders                    ?status=              GET             Retrive all the orders stored in the restaurant's database giving the possibility
 *                                  ?skip=n                               to filter orders by their status or the classical pagination options like limit and skip
 *                                  ?limit=m
 *       /orders                        _                 POST            Post a new order
 *       /orders/:id                    _                 DELETE          Delete an order by id
 *       /orders/:id/status             _                 PUT             Update the status of an order given its id
 */

import colors = require('colors');
import mongoose = require('mongoose');
import express = require('express');
import passport = require('passport');           // authentication middleware for Express
import passportHTTP = require('passport-http');  // implements Basic and Digest authentication for HTTP (used for /login endpoint)
import jsonwebtoken = require('jsonwebtoken');  // JWT generation
import cors = require('cors');                  // Enable CORS middleware

const { expressjwt: jwt } = require('express-jwt');            // JWT parsing middleware for express
colors.enabled = true;

let auth: any;

const app = express();

app.listen(8080);

app.use(cors());
app.use(express.json());

app.use(function (req, res, next) {
    console.log("===============================================".inverse);
    console.log("New request for: " + req.url);
    console.log("Method: " + req.method);
    console.log();
    next();
});

app.get("/", function(_, res) {
    res.status(200).json( {
        api_version: "1.0",
        endpoints: ["/orders", "/grande", "/Roma"]
    } );
});


app.route("/orders").get(auth, (req, res, next) => {

}).post(auth, (req, res, next) => {

}).put(auth, (req, res, next) => {

}).delete(auth, (req, res, next) => {

});

/* Other API goes here */

// Add error handling middleware
app.use( function(err,req,res,next) {
    console.log("Request error: ".red + JSON.stringify(err));
    res.status( err.statusCode || 500 ).json( err );
});

// The very last middleware will report an error 404 
// (will be eventually reached if no error occurred and if
//  the requested endpoint is not matched by any route)
//
app.use( (req,res,next) => {
    res.status(404).json({statusCode:404, error:true, errormessage: "Invalid endpoint"} );
});