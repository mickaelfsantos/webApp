const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const Tarefa = new Schema({    
    nome: {
        type: String,
        required: true
    },

    descricao: {
        type: String,
        required: true
    },
    
    dataPrevistaInicio: {
        type: Date,
        format: "DD/MM/YYYY",
        default: Date.now
    },

    dataPrevistaFim: {
        type: Date,
        default: null
    },   

    dataInicio: {
        type: Date,
        default: null
    },

    dataFim: {
        type: Date,
        default: null
    },

    dataFimComRequisicoes: {
        type: Date,
        default: null
    },

    estado: { //0- a calcular datas e valor final, 1- à espera da resposta do cliente, 2- cliente confirma, está à espera da data de incio, 3-em execução, 4-finalizada
        type: String,
        enum: ['associada', 'porAceitar', 'aceite', 'recusada', 'emExecucao', 'finalizada'],
        default: 'associada'
    },

    justificacao: {
        type: String
    },

        
    validada: {
        type:Boolean,
        default: false
    },

    importancia: {
        type:String,
        enum:["baixa", "media", "alta"],
        default:"baixa"
    },

    progresso: {
        type:Number,
        max:100,
        min:0,
        default: 0
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

    obra: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Obra",
        required: true
    }
})

mongoose.model("tarefas", Tarefa)