const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const Cliente = new Schema({    
    nome: {
        type: String,
        required: true
    },

    nif: {
        type: Number,
        required:true,
        unique:true
    },

    email: {
        type: String,
        unique: true,
        required: true
    },
    
    morada: {
        type: String,
        required:true
    },

    obras: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Obra"
    }]
})

mongoose.model("clientes", Cliente)