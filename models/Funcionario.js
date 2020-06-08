const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const Funcionario = new Schema({    
    nome: {
        type: String,
        unique: true,
        required: true
    },

    funcoes: {
        type: String,
        required: true
    },

    email: {
        type: String,
        unique: true,
        required: true
    },

    equipa: {
        type: String,
        required: true
    },

    departamento: {
        type: String,
        required: true
    },

    custo: {
        type:Number,
        default: 0
    },

    tarefas: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tarefa"
    }]
})

mongoose.model("funcionarios", Funcionario)