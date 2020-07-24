const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const Saida = new Schema({    
    material: {
        type: String,
        required: true
    },

    quantidade: {
        type: Number,
        required:true
    },

    custo: {
        type: Number,
        default: 0
    },

    dataSaida: {
        type: Date
    }
})

mongoose.model("saidas", Saida)