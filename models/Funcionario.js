const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const Funcionario = new Schema({    
    nome: {
        type: String,
        required: true
    },

    funcao: {
        type: String,
        required: true
    },

    email: {
        type: String,
        unique: true,
        required: true
    },
    
    password: {
        type: String,
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
    }],

    role: {
        type: String,
        enum: ['user', 'userResponsável', 'admin'],
        default: 'user'
    }
})

mongoose.model("funcionarios", Funcionario)