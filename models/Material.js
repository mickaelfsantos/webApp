const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const Material = new Schema({    
    nome: {
        type: String,
        required: true
    },

    quantidade: {
        type: Number,
        required: true,
        default: 0
    },

    custo: {
        type: Number,
        default: 0
    }
})

mongoose.model("materiais", Material)