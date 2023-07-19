import mongoose = require('mongoose');
import crypto = require('crypto');

export enum Roles { Waiter = 1, Cook, Bartender, Cashier, Admin };

export interface User extends mongoose.Document {
    readonly _id: mongoose.Schema.Types.ObjectId,
    username: string,
    digestpwd: string, // hashed password
    salt: string,
    role: number,
    name: string,
    surname: string,
    birthday: Date,
    setPassword: (pwd: string) => void,
    checkPassword: (pwd: string) => boolean,
    setRole: (role: Roles) => void,
    hasRole: () => Roles,
    getUserInfo: () => string
};

const userSchema = new mongoose.Schema<User>({
    username: {
        type: mongoose.SchemaTypes.String,
        required: true
    },
    digestpwd: {
        type: mongoose.SchemaTypes.String,
        required: true,
        unique: true
    },
    salt: {
        type: mongoose.SchemaTypes.String,
        required: true
    },
    role: {
        type: mongoose.SchemaTypes.Number,
        required: true
    },
    name: {
        type: mongoose.SchemaTypes.String,
        required: false
    },
    surname: {
        type: mongoose.SchemaTypes.String,
        required: false
    },
    birthday: {
        type: mongoose.SchemaTypes.Date,
        required: false
    }
});

userSchema.methods.setPassword = function(pwd: string) {
    this.salt = crypto.randomBytes(16).toString('hex');
    const hmac = crypto.createHmac('sha512', this.salt );
    hmac.update( pwd );
    this.digestpwd = hmac.digest('hex');
};

userSchema.methods.checkPassword = function(pwd: string): boolean {
    const hmac = crypto.createHmac('sha512', this.salt );
    hmac.update(pwd);
    const digest = hmac.digest('hex');
    return (this.digest === digest);
};

userSchema.methods.setRole = function(role: Roles) {
    this.role = role;
};

userSchema.methods.hasRole = function(): Roles {
    return this.role;
};

userSchema.methods.getUserInfo = function(): string {
    return "<User[nome: " + this.name + ", cognome: " + this.surname + ", datanascita: " + this.birthday + "]>"
};

export function getSchema() { return userSchema; }

// Mongoose Model
let userModel;  // This is not exposed outside the model
export function getModel() : mongoose.Model< User >  { // Return Model as singleton
    if( !userModel ) {
        userModel = mongoose.model('User', getSchema() )
    }
    return userModel;
}

export function newUser( data ): User {
    let _usermodel = getModel();
    let user = new _usermodel( data );

    return user;
}