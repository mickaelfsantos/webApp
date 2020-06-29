const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const Maquina = new Schema({    
    nome: {
        type: String,
        required: true,
        unique: true
    },

    departamento: {
        type: String,
        required: true
    },

    custo: {
        type:Number,
        default: 0
    }
})

mongoose.model("maquinas", Maquina)