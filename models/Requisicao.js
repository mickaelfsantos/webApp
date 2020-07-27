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

    tarefaNome: {
        type:String
    },

    maquinaNome: {
        type:String
    },

    funcionarioNome: {
        type:String
    },

    descricao: {
        type:String,
        required: true
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
    },

    despesa:{
        type:Number,
        default: 0
    },

    orcamento:{
        type:Number,
        default: 0
    },

    despesaFinal: {
        type: Number,
        default: 0
    },

    custoFinal: {
        type: Number,
        default: 0
    },

})

mongoose.model("requisicoes", Requisicao)