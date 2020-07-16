const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const Requisicao = new Schema({    
    tarefa: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tarefa"
    },

    maquina: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Maquina"
    },

    funcionario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Funcionario"
    },

    dataPrevistaInicio: {
        type: Date,
        required: true
    },

    dataPrevistaFim: {
        type: Date,
        required: true
    },

    dataInicio: {
        type: Date,
        default: null
    },

    dataFim: {
        type: Date,
        default: null
    },

    estado: {
        type: String,
        enum: ['preProducao', 'emExecucao', 'finalizada'],
        default: 'preProducao'
    }

})

mongoose.model("requisicoes", Requisicao)