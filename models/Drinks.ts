import mongoose = require('mongoose');

export interface Drink extends mongoose.Document {
    readonly _id: mongoose.Schema.Types.ObjectId,
    name: string,
    ingredients: string[],
    price: number,
    menuCategory: string
};

const drinkSchema = new mongoose.Schema<Drink>({
    name: {
        type: mongoose.SchemaTypes.String,
        required: true
    },
    ingredients: {
        type: [mongoose.SchemaTypes.String],
        required: false,
    },
    price: {
        type: mongoose.SchemaTypes.Number,
        required: true
    },
    menuCategory: {
        type: mongoose.SchemaTypes.String,
        required: true
    },
});


export function getSchema() { return drinkSchema; }

// Mongoose Model
let drinkModel;  // This is not exposed outside the model
export function getModel() : mongoose.Model<Drink>  { // Return Model as singleton
    if( !drinkModel ) {
        drinkModel = mongoose.model('Drink', getSchema() )
    }

    return drinkModel;
}

export function newDrink( data ): Drink {
    let _drinkmodel = getModel();
    return new _drinkmodel( data );
}