const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const Obra = new Schema({
    nome: {
        type: String,
        required: true
    },

    descricao: {
        type: String,
        required: true
    },

    dataPrevistaDeInicio: {
        type: Date
    },

    dataPrevistaDeFim: {
        type: Date
    },

    dataDeInicio: {
        type: Date
    },

    dataDeFim: {
        type: Date
    },

    estado: { //0- a calcular datas e valor final, 1- à espera da resposta do cliente, 2- cliente confirma, está à espera da data de incio, 3-em execução, 4-finalizada
        type: Number,
        default: 0
    },

    orcamento: {
        type: Number
    },

    custoFinal: {
        type: Number
    }
})

mongoose.model("obras", Obra)