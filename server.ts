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
 *       /orders                    ?status=n             GET             Retrive all the orders stored in the restaurant's database giving the possibility
 *                                  ?table=n                              to filter orders by their status or the classical pagination options like limit and skip
 *                                  ?skip=n
 *                                  ?limit=m
 *       /orders                        _                 POST            Post a new order
 *       /orders/:id                    _                 DELETE          Delete an order by id
 *       /orders/:id/status             _                 PUT             Update the status of an order given its id
 * 
 *       /login                         _                 POST            Login an existing user, returning a JWT
 */


import * as user from './models/Users';
import * as dish from './models/Dishes';
import * as drink from './models/Drinks';
import * as table from './models/Tables';
import colors = require('colors');
import http = require('http');                  // HTTP module
import mongoose = require('mongoose');
import express = require('express');
import passport = require('passport');           // authentication middleware for Express
import passportHTTP = require('passport-http');  // implements Basic and Digest authentication for HTTP (used for /login endpoint)
import jsonwebtoken = require('jsonwebtoken');  // JWT generation
import cors = require('cors');                  // Enable CORS middleware
const io = require('socket.io');               // Socket.io websocket library
const { expressjwt: jwt } = require('express-jwt');            // JWT parsing middleware for express
colors.enabled = true;

const result = require('dotenv').config();          // dotenv module will load the file named '.env' and all the key-value
                                                    // pairs into process.env environment variable

if (result.error) {
    console.log("Unable to load \".env\" file. Please provide one to store the JWT secret key");
    process.exit(-1);
}

if( !process.env.JWT_SECRET ) {
    console.log("\".env\" file loaded but JWT_SECRET=<secret> key-value pair was not found");
    process.exit(-1);
}

if( !process.env.PORT ) {
    console.log("\".env\" file loaded but PORT=<value> key-value pair was not found");
    process.exit(-1);
}

const auth = null;
let ios = undefined;
let app = express();

app.use(cors());
app.use(express.json());

//app.listen(8080);

app.use(function (req, _, next) {
    console.log("===============================================".inverse);
    console.log("New request for: " + req.url);
    console.log("Method: " + req.method);
    console.log();
    next();
});

/*
          __
         / /
        / / 
       / /  
      / /   
     /_/    

 Endpoint: /
*/
app.get("/", function(_, res) {
    res.status(200).json( {
        api_version: "1.0",
        endpoints: ["/orders", "/grande", "/login"]
    } );
});

/*
         __                _               
        / /               | |              
       / /    ___  _ __ __| | ___ _ __ ___ 
      / /    / _ \| '__/ _` |/ _ \ '__/ __|
     / /    | (_) | | | (_| |  __/ |  \__ \
    /_/      \___/|_|  \__,_|\___|_|  |___/
                                        
 Endpoint: /orders                                      
*/
/*
app.route("/orders").get(auth, (req, res, next) => {
    let filter = {};
    if( req.query.tags ) {
        filter = { tags: {$all: req.query.tags } };
    }
    console.log("Using filter: " + JSON.stringify(filter) );
    console.log(" Using query: " + JSON.stringify(req.query) );

    return res.status(200).json( "ciao:test" );
}).post(auth, (req, res, next) => {
    return res.status(200).json( "ciao:test" );
}).put(auth, (req, res, next) => {
    return res.status(200).json( "ciao:test" );
}).delete(auth, (req, res, next) => {
    return res.status(200).json( "ciao:test" );
});
*/

/* Other API goes here */



// Add error handling middleware
app.use( function(err, _1, res, _2) {
    console.log("Request error: ".red + JSON.stringify(err));
    res.status( err.statusCode || 500 ).json( err );
});

// The very last middleware will report an error 404 
// (will be eventually reached if no error occurred and if
//  the requested endpoint is not matched by any route)
//
app.use( (_, res, next) => {
    res.status(404).json({statusCode:404, error:true, errormessage: "Invalid endpoint"} );
});


/*


    Database setup
*/
// Connect to mongodb and launch the HTTP server trough Express
//
mongoose.connect( 'mongodb://mymongo:27017/restaurant_manager' )
.then( 
    () => {
        console.log("Connected to MongoDB");
        return user.getModel().findOne( {username:"admin"} );
    }
).then(
    (doc) => {
        if (!doc) {
            console.log("Creating admin user");

            let u = user.newUser({
                username: "admin",
                mail: "admin@restaurantmanager.it",
                name: "Administrator",
                surname: "",
                birthday: null
            });

            u.setRole(user.Roles.Admin);
            u.setPassword("adminpwd");
            return u.save();
        } else {
            console.log("Admin user already exists");
        }
    }
).then(    // Check if exists some dishes, drinks and tables inside the db
    () => {
        return dish.getModel().countDocuments({});
    }
).then(
    (info) => {
        if (info == 0) {
            console.log("Adding some dishes into the database");
            let d1 = dish.getModel().create({name: "Pasta al pomodoro", ingredients: ["Penne", "Pomodoro", "Basilico", "Olio extravergine d'oliva"], recipe: "Pesare la pasta, portare ad ebollizione l'acqua, cucinare la pasta, condire la pasta con il sugo di pomodoro e olio a piacere", cookingTime: 30, price: 6.99, menuCategory: "PRIMI PIATTI"});
            let d2 = dish.getModel().create({name: "Tagliata di carne", ingredients: ["Tagliata di manzo", "Pomodorini", "Rucola", "Olio extravergine d'oliva"], cookingTime: 40, price: 14.99, menuCategory: "SECONDI PIATTI"});
            let d3 = dish.getModel().create({name: "Bicchiere di Tiramisù", ingredients: ["Mascarpone", "Uova", "Caffè", "Savoiardi", "Zucchero", "Cacao amaro"], cookingTime: 10, price: 3.50, menuCategory: "DOLCI"});
            return Promise.all([d1, d2, d3]);
        }
    }
).then(
    () => {
        return drink.getModel().countDocuments({});
    }
).then(
    (info) => {
        if (info == 0) {
            console.log("Adding some drinks into the database");
            let d1 = drink.getModel().create({name: "Coca Cola", price: 2.50, menuCategory: "BEVANDE"});
            let d2 = drink.getModel().create({name: "Acqua minerale", price: 1.50, menuCategory: "BEVANDE"});
            let d3 = drink.getModel().create({name: "Vino Rosso", price: 4.50, menuCategory: "VINI"});
            return Promise.all([d1, d2, d3]);
        }
    }
).then(
    () => {
        return table.getModel().countDocuments({});
    }
).then(
    (info) => {
        if (info == 0) {
            console.log("Adding some tables into the database");
            let t1 = table.getModel().create({number: 1, seats: 5});
            let t2 = table.getModel().create({number: 2, seats: 3});
            let t3 = table.getModel().create({number: 3, seats: 2});
            let t4 = table.getModel().create({number: 4, seats: 5});
            let t5 = table.getModel().create({number: 5, seats: 2});
            let t6 = table.getModel().create({number: 6, seats: 2});
            let t7 = table.getModel().create({number: 7, seats: 4});
            let t8 = table.getModel().create({number: 8, seats: 4});
            let t9 = table.getModel().create({number: 9, seats: 4});
            let t10 = table.getModel().create({number: 10, seats: 3});
            return Promise.all([t1, t2, t3, t4, t5, t6, t7, t8, t9, t10]);
        }
    }
).then(      
    () => {
        let server = http.createServer(app);

        ios = io(server)
        ios.on('connection', function (client) {
            console.log("Socket.io client connected".green);
        });

        server.listen(process.env.PORT, () => console.log("HTTP Server started on port 8080".green));
    }
).catch(
    (err) => {
        console.log("Error Occurred during initialization".red );
        console.log(err);
    }
);