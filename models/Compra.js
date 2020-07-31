const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const Compra = new Schema({    
    obra: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Obra",
        required: true
    },

    funcionario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Funcionario",
        required: true
    },

    material: {
        type: String,
        required: true
    },

    descricao: {
        type: String
    },

    quantidade: {
        type: String,
        required:true
    },

    custo: {
        type: Number,
        required:true
    },

    fornecedor: {
        type:String,
        required: true
    }

})

mongoose.model("compras", Compra)