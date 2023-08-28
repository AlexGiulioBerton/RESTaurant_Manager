import mongoose = require('mongoose');

export interface Table extends mongoose.Document {
    readonly _id: mongoose.Schema.Types.ObjectId,
    number: number,
    seats: number,
    occupiedSeats: number,
    hasSeats: () => number,
    getTableInfo: () => string
};

const tableSchema = new mongoose.Schema<Table>({
    number: {
        type: mongoose.SchemaTypes.Number,
        required: true,
        unique: true
    },
    seats: {
        type: mongoose.SchemaTypes.Number,
        required: false
    },
    occupiedSeats: {
        type: mongoose.SchemaTypes.Number,
        required: false
    }
});

export function isTable(arg: any): arg is Table {
    return arg &&
           arg.number &&
           typeof(arg.number) == 'number' &&
           arg.seats &&
           typeof(arg.seats) == 'number' &&
           arg.occupiedSeats &&
           typeof(arg.occupiedSeats) == 'number';
}

tableSchema.methods.getTableInfo = function(): string {
    return "<Table[code: " + this.number + ", #seats: " + this.seats + "]>";
};

export function getSchema() { return tableSchema; }

// Mongoose Model
let tableModel;  // This is not exposed outside the model
export function getModel() : mongoose.Model< Table >  { // Return Model as singleton
    if( !tableModel ) {
        tableModel = mongoose.model('Table', getSchema() )
    }
    return tableModel;
}

export function newTable( data ): Table {
    let _tablemodel = getModel();
    return new _tablemodel( data );
}