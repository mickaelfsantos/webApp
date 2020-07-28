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

    foto:{
        type: String,
        default: "/img/default.png"
    },

    custo: {
        type:Number,
        default: 0
    },

    tarefas: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tarefa"
    }],

    tarefasCriadas: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tarefa"
    }],

    obras: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Obra"
    }],

    role: {
        type: String,
        enum: ['user', 'userResponsavel', 'admin'],
        default: 'user'
    }
})

mongoose.model("funcionarios", Funcionario)