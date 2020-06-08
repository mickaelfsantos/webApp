const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const Tarefa = new Schema({    
    nome: {
        type: String,
        unique: true,
        required: true
    },

    descricao: {
        type: String,
        required: true
    },

    funcionarios: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Funcionario"
    }],

    dataPrevistaInicio: {
        type: Date,
        default: Date.now
    },

    dataPrevistaFim: {
        type: Date,
        default: null
    },

    dataDeInicio: {
        type: Date,
        default: null
    },

    dataDeFim: {
        type: Date,
        default: null
    },

    estado: { //0- a calcular datas e valor final, 1- à espera da resposta do cliente, 2- cliente confirma, está à espera da data de incio, 3-em execução, 4-finalizada
        type: String,
        enum: ['porAceitar', 'aceite', 'recusada', 'emExecucao', 'finalizada'],
        default: 'porAceitar'
    },

    justificacao: {
        type: String
    },

    duracao: {
        type: Number
    },
    
    validada: {
        type:Boolean,
        default: false
    },

    obra: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Obra",
        required: true
    }
})

mongoose.model("tarefas", Tarefa)