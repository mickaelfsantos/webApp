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

    dataPrevistaDeInicio: {
        type: Date,
        default: Date.now
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

    estado: {
        type: String,
        enum: ['preOrcamento', 'aAguardarResposta', 'preProducao', 'producao', 'finalizada' ],
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