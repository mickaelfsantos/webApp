const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const Obra = new Schema({    
    nome: {
        type: String,
        unique: true,
        required: true
    },

    descricao: {
        type: String,
        required: true
    },

    dataPrevistaInicio: {
        type: Date,
        default: Date.now()
    },

    dataPrevistaFim: {
        type: Date,
        default:null
    },

    dataInicio: {
        type: Date,
        default:null
    },

    dataFim: {
        type: Date,
        default:null
    },

    estado: {
        type: String,
        enum: ['preOrcamento', 'aAguardarResposta', 'preProducao', 'producao', 'finalizada' ],
        default: 'preOrcamento'
    },

    orcamento: {
        type: Number,
        default: 0
    },

    custoFinal: {
        type: Number,
        default: 0
    },

    despesa: {
        type: Number,
        default: 0
    },

    despesaFinal: {
        type: Number,
        default: 0
    },

    percentagemLucro: {
        type:Number,
        default: 25,
        min: 0
    }
})

mongoose.model("obras", Obra)