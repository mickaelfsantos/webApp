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

    tarefas: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tarefa"
    },

    dataPrevistaDeInicio: {
        type: Date,
        required: true,
        default: Date.now
    },

    dataPrevistaDeFim: {
        type: Date,
        required: true
    },

    dataDeInicio: {
        type: Date
    },

    dataDeFim: {
        type: Date
    },

    estado: { //0- a calcular datas e valor final, 1- à espera da resposta do cliente, 2- cliente confirma, está à espera da data de incio, 3-em execução, 4-finalizada
        type: String,
        enum: ['preExecucao', 'aExecutar', 'finalizada'],
        default: 'preExecucao'
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
        ref: "Obra"
    }
})

mongoose.model("tarefas", Tarefa)