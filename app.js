//Módulos
    const express = require('express')
    const handlebars = require('express-handlebars')
    const bodyParser = require('body-parser')
    const app = express()
    const user = require('./routes/user')
    const userResponsavel = require('./routes/userResponsavel')
    const path = require('path')
    const mongoose = require('mongoose')

//Configurações

    //Body Parser
        app.use(bodyParser.urlencoded({extended: true}))
        app.use(bodyParser.json())

    //Handlebars
    app.engine('handlebars', handlebars({defaultLayout: 'main'}))
    app.set('view engine', 'handlebars');

    //Public
    app.use(express.static(path.join(__dirname, "public")))
    
    //Mongoose
        mongoose.Promise = global.Promise
        mongoose.connect("mongodb://localhost/webApp", {useNewUrlParser:true, useUnifiedTopology: true}).then(function(){
            console.log("MongoDB: conectado");
        }).catch(function(erro){
            console.log("MongoDB: erro - "+erro);
        })

//Rotas
    app.use('', user)
    app.use('', userResponsavel)


//Outros
const PORT = 8081;
app.listen(PORT, function(){
    console.log("Servidor a rodar")
})