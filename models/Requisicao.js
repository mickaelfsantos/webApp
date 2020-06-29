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

    dataInicio: {
        type: Date,
        required: true
    },

    dataFim: {
        type: Date,
        required: true
    },

    estado: { //1- à espera da resposta do cliente, 2- cliente confirma, está à espera da data de incio, 3-em execução, 4-finalizada
        type: String,
        enum: ['porFazer', 'aceite', 'emExecucao', 'finalizada'],
        default: 'porFazer'
    }

})

mongoose.model("requisicoes", Requisicao)