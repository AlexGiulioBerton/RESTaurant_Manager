import mongoose = require('mongoose');

export interface Order extends mongoose.Document {
    readonly _id: mongoose.Schema.Types.ObjectId,
    dishes: [mongoose.Schema.Types.ObjectId],   // array of dishes
    drinks: [mongoose.Schema.Types.ObjectId],   // array of drinks
    table: mongoose.Schema.Types.ObjectId       // reference to a table
    time: Date,
    dishesStatus: mongoose.Schema.Types.Number, // status of preparation for the dishes (0 -> in queue, 1-> in preparation, 2 -> ready, 3 -> served, 4 -> paid)
    drinksStatus: mongoose.Schema.Types.Number, // status of preparation for the drinks (0 -> in queue, 1-> in preparation, 2 -> ready, 3 -> served, 4 -> paid)
    waiter: string      // reference to a user (waiter)
};


const orderSchema = new mongoose.Schema<Order>({
    dishes: {
        type: [mongoose.Schema.Types.ObjectId], 
        ref: 'Dish',
        required: true
    },
    drinks: {
        type: [mongoose.Schema.Types.ObjectId], 
        ref: 'Drink',
        required: true,
    },
    table: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Table',
        required: true
    },
    time: {
        type: mongoose.SchemaTypes.Date,
        required: true
    },
    dishesStatus: {
        type: mongoose.Schema.Types.Number,
        required: true
    },
    drinksStatus: {
        type: mongoose.Schema.Types.Number,
        required: true
    },
    waiter: {
        type: mongoose.Schema.Types.String, 
        ref: 'User',
        required: true
    }
});

export function isOrder(arg: any): arg is Order {
    return arg &&
           arg.dishes &&
           Array.isArray(arg.dishes) &&
           arg.drinks &&
           Array.isArray(arg.drinks) &&
           arg.table &&
           typeof(arg.table) == 'string' &&
           arg.time &&
           arg.time instanceof Date && 
           arg.dishesStatus &&
           typeof(arg.dishesStatus) == 'number' &&
           arg.drinksStatus &&
           typeof(arg.drinksStatus) == 'number' &&
           arg.waiter &&
           typeof(arg.waiter) == 'string';
}


export function getSchema() { return orderSchema; }

// Mongoose Model
let orderModel;  // This is not exposed outside the model
export function getModel() : mongoose.Model<Order>  { // Return Model as singleton
    if( !orderModel ) {
        orderModel = mongoose.model('Order', getSchema() )
    }

    return orderModel;
}

export function newOrder( data ): Order {
    let _ordermodel = getModel();
    return new _ordermodel( data );
}