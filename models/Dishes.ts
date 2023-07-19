import mongoose = require('mongoose');

export interface Dish extends mongoose.Document {
    readonly _id: mongoose.Schema.Types.ObjectId,
    name: string,
    ingredients: string[],
    recipe: string,
    cookingTime: number,
    price: number,
    menuCategory: string
};

const dishSchema = new mongoose.Schema<Dish>({
    name: {
        type: mongoose.SchemaTypes.String,
        required: true
    },
    ingredients: {
        type: [mongoose.SchemaTypes.String],
        required: true,
    },
    recipe: {
        type: mongoose.SchemaTypes.String,
        required: false
    },
    cookingTime: {
        type: mongoose.SchemaTypes.Number,
        required: true
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


export function getSchema() { return dishSchema; }

// Mongoose Model
let dishModel;  // This is not exposed outside the model
export function getModel() : mongoose.Model<Dish>  { // Return Model as singleton
    if( !dishModel ) {
        dishModel = mongoose.model('Dish', getSchema() )
    }

    return dishModel;
}

export function newDish( data ): Dish {
    let _dishmodel = getModel();
    return new _dishmodel( data );
}