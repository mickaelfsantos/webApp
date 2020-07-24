const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const Compra = new Schema({    
    funcionario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Funcionario"
    },

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

    fornecedor: {
        type:String,
        required: true
    },

    dataPrevistaEntrega: {
        type: Date,
        required: true
    },

    dataEntrega: {
        type: Date,
        default: null
    }
})

mongoose.model("compras", Compra)