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
 *       /users                         _                 POST            Post a new user
 *       /users/:id                     _                 GET             Retrive all the user info given its id
 *       /users/:id                     _                 DELETE          Delete a user given its id
 * 
 *       /login                         _                 POST            Login an existing user, returning a JWT
 * 
 * 
 * 
 */



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

import * as user from './models/Users';
import * as dish from './models/Dishes';
import * as drink from './models/Drinks';
import * as table from './models/Tables';
import * as order from './models/Orders';
import colors = require('colors');
import bodyParser = require('body-parser');
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

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - */

let auth = jwt( {
    secret: process.env.JWT_SECRET, 
    algorithms: ["HS256"]
});

let ios = undefined;
let app = express();

app.use(cors());
app.use(express.json());
app.use(passport.initialize())
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

app.use(function (req, _, next) {
    console.log();
    console.log("===================================================================".inverse);
    console.log("New request for: " + req.url.gray.italic);

    if (req.method == "GET") console.log("Method: " + req.method.green);
    else if (req.method == "POST") console.log("Method: " + req.method.yellow);
    else if (req.method == "PUT") console.log("Method: " + req.method.blue);
    else if (req.method == "DELETE") console.log("Method: " + req.method.red);

    console.log(("Time: " + new Date()).gray);
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

app.get("/", (req,res) => {
    res.status(200).json( { 
        api_version: "1.0", 
        endpoints: [ "/dishes", "/drinks", "/tables", "/orders", "/users", "/login" ] 
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

app.get('/orders/:id?', auth, (req, res, next) => {
    if (req.params.id) {
        let id = req.params.id;
        order.getModel().findOne( {_id: id } ).then(
            (result) => { return res.status(200).json( result ); }
        ).catch( 
            (reason) => { return next({ statusCode:404, error: true, errormessage: "DB error: "+reason }); }
        )
    } else {
        let skip = parseInt( req.query.skip as string || "0" ) || 0;
        let limit = parseInt( req.query.limit as string || "20" ) || 20;
        let t = req.query.table;
        let s = req.query.status;
        let filter = { };
        
        if (t && s) filter = { table: t, status: s };
        else if (t && !s) filter = { table: t };
        else if (!t && s) filter = { status: s };

        order.getModel().find( filter ).sort({timestamp:-1}).skip( skip ).limit( limit ).then( 
            (documents) => { return res.status(200).json( documents ); }
        ).catch( 
            (reason) => { return next({ statusCode:404, error: true, errormessage: "DB error: "+reason }); }
        );
    }
});

app.post('/orders', (req, res, next) => {
    let o = order.newOrder(req.body);

    o.save().then(
        (data) => {
            ios.emit('broadcast', data);
            console.log("Order added to the db".green);
            return res.status(200).json({error: false, errormessage: "", id: data._id})
        }
    ).catch(
        (reason) => {
            return next({ statusCode:404, error: true, errormessage: "DB error: "+reason.errmsg });
        }
    )
});

app.put('/orders/:id/dishstatus', (req, res, next) => {
    let id = req.params.id;

    order.getModel().updateOne( { _id: id }, req.body ).then(
        (data) => {
            console.log("Dishes status modified".green);
            return res.status(200).json( { error: false, errormessage: "", elements_modified: data.matchedCount} );
        }
    ).catch(
        (reason) => {
            return next({ statusCode:404, error: true, errormessage: "DB error: "+reason });
        }
    )
});

app.put('/orders/:id/drinkstatus', (req, res, next) => {
    let id = req.params.id;

    console.log(req.body);

    order.getModel().updateOne( { _id: id }, req.body ).then(
        (data) => {
            console.log("Drinks status modified".green);
            return res.status(200).json( { error: false, errormessage: "", elements_modified: data.matchedCount} );
        }
    ).catch(
        (reason) => {
            return next({ statusCode:404, error: true, errormessage: "DB error: "+reason });
        }
    )
});

app.delete('/orders/:id', auth, (req, res, next) => {
    let order_id = req.params.id;

    order.getModel().deleteOne( { _id: order_id } ).then(
        ( q ) => {
            if( q.deletedCount > 0 ) {
                console.log("Order deleted".green);
                return res.status(200).json( {error:false, errormessage:""} );
            } else
                return res.status(404).json( {error:true, errormessage:"Invalid order id"} );
        }
    ).catch( 
        (reason)=> {
            return next({ statusCode:404, error: true, errormessage: "DB error: "+reason });
        }
    );
});

/*
         __                          
        / /                          
       / /   _   _ ___  ___ _ __ ___ 
      / /   | | | / __|/ _ \ '__/ __|
     / /    | |_| \__ \  __/ |  \__ \
    /_/      \__,_|___/\___|_|  |___/

    Endpoint: /users
*/

app.get('/users/:username?', auth, (req, res, next) => {
    if (req.params.username) {
        let usrn = req.params.username;

        user.getModel().findOne( { _id: usrn } ).then(
            (result) => {
                return res.status(200).json( result );
            }
        ).catch(
            (reason) => {
                return next({ statusCode:404, error: true, errormessage: "DB error: "+reason });
            }
        );
    } else {
        let skip = parseInt( req.query.skip as string || "0" ) || 0;
        let limit = parseInt( req.query.limit as string || "20" ) || 20;

        user.getModel().find( { } ).sort({timestamp:-1}).skip( skip ).limit( limit ).then( 
            (documents) => { return res.status(200).json( documents ); }
        ).catch( 
            (reason) => { return next({ statusCode:404, error: true, errormessage: "DB error: "+reason }); }
        );
    }
    
});

app.post('/users', (req, res, next) => {
    let u = user.newUser(req.body);

    if( !req.body.password ) {
        return next({ statusCode:404, error: true, errormessage: "Password field missing"} );
    }

    u.setPassword(req.body.password);

    u.save().then(
        (data) => {
            console.log("User added to the db".green);
            return res.status(200).json({error: false, errormessage: "", id: data._id})
        }
    ).catch(
        (reason) => {
            return next({ statusCode:404, error: true, errormessage: "DB error: "+reason.errmsg });
        }
    );
});

app.delete('/users/:username', auth, (req, res, next) => {
    let usrn = req.params.username;

    user.getModel().deleteOne({_id: usrn}).then(
        ( q ) => {
            if( q.deletedCount > 0 ) {
                console.log("User removed from the system".green);
                return res.status(200).json( {error:false, errormessage:""} );
            } else 
                return res.status(404).json( {error:true, errormessage:"Invalid username"} );
        }
    ).catch( 
        (reason)=> {
            return next({ statusCode:404, error: true, errormessage: "DB error: "+reason });
        }
    );
});

/*
         __      _ _     _               
        / /     | (_)   | |              
       / /    __| |_ ___| |__   ___  ___ 
      / /    / _` | / __| '_ \ / _ \/ __|
     / /    | (_| | \__ \ | | |  __/\__ \
    /_/      \__,_|_|___/_| |_|\___||___/
                                        
    Endpoint: /dishes
*/

app.get('/dishes/:id?', auth, (req, res, next) => {
    if (req.params.id) {
        let id = req.params.id;
        dish.getModel().findOne( {_id: id } ).then(
            (result) => { return res.status(200).json( result ); }
        ).catch( 
            (reason) => { return next({ statusCode:404, error: true, errormessage: "DB error: "+reason }); }
        )
    } else {
        let category;
        if (req.query.category) category = req.query.category;
        
        let skip = parseInt( req.query.skip as string || "0" ) || 0;
        let limit = parseInt( req.query.limit as string || "20" ) || 20;
        
        dish.getModel().find( (category) ? { menuCategory: category } : { } ).limit(limit).skip(skip).then(
            (result) => { return res.status(200).json( result ); }
        ).catch( 
            (reason) => { return next({ statusCode:404, error: true, errormessage: "DB error: "+reason }); }
        )
    }
});

app.post('/dishes', auth, (req, res, next) => {
    let new_dish = dish.newDish(req.body);

    new_dish.save().then(
        (data) => {
            ios.emit('broadcast', data );
            console.log("Dish added to the db".green);
            return res.status(200).json({error: false, errormessage: "", id: data._id})
        }
    ).catch(
        (reason) => {
            return next({ statusCode:404, error: true, errormessage: "DB error: "+reason.errmsg });
        }
    );
});

app.delete('/dishes/:id', auth, (req, res, next) => {
    let id = req.params.id;

    dish.getModel().deleteOne( {_id: id } ).then( 
        ( q ) => {
          if( q.deletedCount > 0 ) 
            return res.status(200).json( {error:false, errormessage:""} );

          else 
            return res.status(404).json( {error:true, errormessage:"Invalid dish ID"} );
        }
    ).catch( 
        (reason)=> {
            return next({ statusCode:404, error: true, errormessage: "DB error: "+reason });
        }
    )
});


/*
         __      _      _       _        
        / /     | |    (_)     | |       
       / /    __| |_ __ _ _ __ | | _____ 
      / /    / _` | '__| | '_ \| |/ / __|
     / /    | (_| | |  | | | | |   <\__ \
    /_/      \__,_|_|  |_|_| |_|_|\_\___/

    Endpoint: /drinks
*/

app.get('/drinks/:id?', auth, (req, res, next) => {
    if (req.params.id) {
        let id = req.params.id;
        
        drink.getModel().findOne( {_id: id } ).then(
            (result) => { return res.status(200).json( result ); }
        ).catch( 
            (reason) => { return next({ statusCode:404, error: true, errormessage: "DB error: "+reason }); }
        )
    } else {
        let category;
        if (req.query.category) category = req.query.category;
        
        let skip = parseInt( req.query.skip as string || "0" ) || 0;
        let limit = parseInt( req.query.limit as string || "20" ) || 20;
        
        drink.getModel().find( (category) ? { menuCategory: category } : { } ).limit(limit).skip(skip).then(
            (result) => { return res.status(200).json( result ); }
        ).catch( 
            (reason) => { return next({ statusCode:404, error: true, errormessage: "DB error: "+reason }); }
        )
    }
});

app.post('/drinks', auth, (req, res, next) => {
    let new_drink = drink.newDrink(req.body);

    new_drink.save().then(
        (data) => {
            ios.emit('broadcast', data );
            console.log("Drink added to the db".green);
            return res.status(200).json({error: false, errormessage: "", id: data._id})
        }
    ).catch(
        (reason) => {
            return next({ statusCode:404, error: true, errormessage: "DB error: "+reason.errmsg });
        }
    );
});

app.delete('/drinks/:id', auth, (req, res, next) => {
    let id = req.params.id;

    drink.getModel().deleteOne( {_id: id } ).then( 
        ( q ) => {
          if( q.deletedCount > 0 ) 
            return res.status(200).json( {error:false, errormessage:""} );

          else 
            return res.status(404).json( {error:true, errormessage:"Invalid drink ID"} );
        }
    ).catch( 
        (reason)=> {
            return next({ statusCode:404, error: true, errormessage: "DB error: "+reason });
        }
    )
});


/*
         __  _        _     _           
        / / | |      | |   | |          
       / /  | |_ __ _| |__ | | ___  ___ 
      / /   | __/ _` | '_ \| |/ _ \/ __|
     / /    | || (_| | |_) | |  __/\__ \
    /_/      \__\__,_|_.__/|_|\___||___/                     
                            
    Endpoint: /tables
*/

app.get('/tables/:id?', auth, (req, res, next) => {
    if (req.params.id) {
        let id = req.params.id;
        
        table.getModel().findOne( {_id: id } ).then(
            (result) => { return res.status(200).json( result ); }
        ).catch(
            (reason) => { return next({ statusCode:404, error: true, errormessage: "DB error: "+reason }); }
        )
    } else {
        let tableseats;
        if (req.query.seats) tableseats = req.query.seats;

        let skip = parseInt( req.query.skip as string || "0" ) || 0;
        let limit = parseInt( req.query.limit as string || "20" ) || 20;
        
        table.getModel().find( (tableseats) ? { seats: tableseats } : { } ).limit(limit).skip(skip).then(
            (result) => { return res.status(200).json( result ); }
        ).catch( 
            (reason) => { return next({ statusCode:404, error: true, errormessage: "DB error: "+reason }); }
        )
    }
});

app.post('/tables', auth, (req, res, next) => {
    let new_table = table.newTable(req.body);

    new_table.save().then(
        (data) => {
            ios.emit('broadcast', data);
            console.log("Table added to the db".green);
            return res.status(200).json({error: false, errormessage: "", id: data._id})
        }
    ).catch(
        (reason) => {
            return next({ statusCode:404, error: true, errormessage: "DB error: "+reason.errmsg });
        }
    );
});

app.put('/tables/:id/occupied', auth, (req, res, next) => {
    let id = req.params.id;

    table.getModel().updateOne( { _id: id }, req.body ).then(
        (data) => {
            console.log("Tables status modified".green);
            return res.status(200).json( { error: false, errormessage: "", elements_modified: data.matchedCount} );
        }
    ).catch(
        (reason) => {
            return next({ statusCode:404, error: true, errormessage: "DB error: "+reason });
        }
    )
});


app.delete('/tables/:id', auth, (req, res, next) => {
    let id = req.params.id;

    table.getModel().deleteOne( {_id: id } ).then( 
        ( q ) => {
          if( q.deletedCount > 0 ) 
            return res.status(200).json( {error:false, errormessage:""} );

          else 
            return res.status(404).json( {error:true, errormessage:"Invalid table ID"} );
        }
    ).catch( 
        (reason)=> {
            return next({ statusCode:404, error: true, errormessage: "DB error: "+reason });
        }
    )
});


declare global {
    namespace Express {
        interface User {
            _id: string,
            name: string,
            surname: string,
            birthday: Date,
            role: user.Roles
        }
        
        interface Request {
            auth: {
                _id: string;
            }
        }
    }
}


// Configure HTTP basic authentication strategy trough passport middleware.

passport.use( new passportHTTP.BasicStrategy(
    function(usrn, password, done) {
        console.log("New login attempt from " + usrn);
        
        user.getModel().find( { _id: usrn }).then(
            (response) => {
                if (!response[0]) return done(null,false,{statusCode: 500, error: true, errormessage:"Invalid user"});
                
                let user = response[0];

                if (user.checkPassword(password)) {
                    return done(null, user);
                }

                return done(null,false,{statusCode: 500, error: true, errormessage:"Invalid password"});
            }
        ).catch(
            (reason) => {
                return done(null, false, { statusCode:404, error: true, errormessage: "DB error: "+reason });
            }
        );
    }
));

// Login endpoint uses passport middleware to check
// user credentials before generating a new JWT
app.get("/login", passport.authenticate('basic', { session: false }), (req,res) => {
  
    let tokendata = {
        birthday: req.user.birthday,
        name: req.user.name,
        surname: req.user.surname,
        role: req.user.role,
        _id: req.user._id
    };
  
    console.log("Login granted. Generating token...".green );
    let token_signed = jsonwebtoken.sign(tokendata, process.env.JWT_SECRET, { expiresIn: '1h' } );
  
    return res.status(200).json({ error: false, errormessage: "", token: token_signed });
});

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
        console.log("Connected to MongoDB".green);
        return user.getModel().findOne( {_id:"admin"} );
    }
).then(
    (doc) => {
        if (!doc) {
            console.log("Creating admin user");

            let u = user.newUser({
                _id: "admin",
                mail: "admin@restaurantmanager.it",
                name: "Administrator",
                surname: "",
                birthday: null
            });

            u.setRole(user.Roles.Admin);
            u.setPassword("adminpwd");
            return u.save();
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
            let t1 = table.getModel().create( { number: 1, seats: 5, occupiedSeats: 0 });
            let t2 = table.getModel().create( { number: 2, seats: 3, occupiedSeats: 0 });
            let t3 = table.getModel().create( { number: 3, seats: 2, occupiedSeats: 0 });
            let t4 = table.getModel().create( { number: 4, seats: 5, occupiedSeats: 0 });
            let t5 = table.getModel().create( { number: 5, seats: 2, occupiedSeats: 0 });
            let t6 = table.getModel().create( { number: 6, seats: 2, occupiedSeats: 0 });
            let t7 = table.getModel().create( { number: 7, seats: 4, occupiedSeats: 0 });
            let t8 = table.getModel().create( { number: 8, seats: 4, occupiedSeats: 0 });
            let t9 = table.getModel().create( { number: 9, seats: 4, occupiedSeats: 0 });
            let t10 = table.getModel().create( { number: 10, seats: 3, occupiedSeats: 0 });
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

        server.listen(process.env.PORT, () => console.log(("HTTP Server started on port " + process.env.PORT).green));
    }
).catch(
    (err) => {
        console.log("Error Occurred during initialization".red );
        console.log(err);
    }
);