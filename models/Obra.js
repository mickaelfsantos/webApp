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

    tarefas: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tarefa"
    }],

    dataPrevistaInicio: {
        type: Date,
        default: Date.now
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
        enum: ['preOrcamento', 'aAguardarResposta', 'preProducao', '', 'finalizada' ],
        default: 'preOrcamento'
    },

    orcamento: {
        type: Number
    },

    custoFinal: {
        type: Number
    }
})

mongoose.model("obras", Obra)