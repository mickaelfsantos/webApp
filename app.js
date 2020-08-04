//Módulos
    const express = require('express')
    const handlebars = require('express-handlebars')
    const bodyParser = require('body-parser')
    const app = express()
    const user = require('./routes/user')
    const userResponsavel = require('./routes/userResponsavel')
    const path = require('path')
    const mongoose = require('mongoose')
    const session = require('express-session')
    const flash = require('connect-flash');
    const moment = require('moment')
    const passport = require('passport')
    const { use } = require('passport')
    require('./config/auth')(passport)
    const db = require('./config/db')

//Configurações
    var u;
    //Session
        app.use(session({
            secret: "webApp",
            resave: true,
            saveUninitialized: true
        }))

        app.use(passport.initialize())
        app.use(passport.session())
        app.use(flash());

    //Middleware
        app.use(function(req, res, next){
            res.locals.success_msg = req.flash("success_msg")
            res.locals.error_msg = req.flash("error_msg")
            res.locals.error = req.flash("error")
            res.locals.user = req.user
            if(req.user != undefined){
                res.locals.nome = req.user.nome;
                res.locals.foto = req.user.foto;
                res.locals.role = req.user.role
                u=res.locals.user;
            }
            next();
        })

    //Body Parser
        app.use(bodyParser.urlencoded({extended: true}))
        app.use(bodyParser.json())

    //Handlebars
    const hbs = handlebars.create({
        defaultLayout: 'main',

        //helpers
        helpers: {
            dateToString: function(data){
                var d = moment(data).format("DD/MM/YYYY HH:mm");
                if(d == "Invalid date" || typeof data == undefined)
                    return "Não definido"
                return d;
            },

            dateToString2: function(data, requisicoes){
                var d = moment(data).format("YYYY-MM-DD HH:mm");
                var dataMaior = null;
                var dataMaiorString = null;
                if(requisicoes.length != 0){
                    dataMaior = moment(requisicoes[0].dataPrevistaFim).format("YYYY-MM-DD HH:mm");
                    dataMaiorString = moment(requisicoes[0].dataPrevistaFim).format("DD/MM/YYYY HH:mm")
                    for(var i=1; i<requisicoes.length; i++){
                        var dataProx = moment(requisicoes[i].dataPrevistaFim).format("YYYY-MM-DD HH:mm");
                        if((dataMaior != "Invalid date" || typeof dataMaior == undefined )&& (dataProx != "Invalid date" || typeof dataProx == undefined)){
                            if(moment(dataProx).isValid() && moment(dataProx).isAfter(dataMaior)){
                                dataMaior = dataProx;
                                dataMaiorString = moment(requisicoes[i].dataPrevistaFim).format("DD/MM/YYYY HH:mm");
                            }
                        }
                    }
                }

                if(d == "Invalid date" || typeof d == undefined){
                    if(dataMaior == "Invalid date" || typeof dataMaior == undefined || dataMaior == null){
                        return "Não definido"
                    }
                    return dataMaiorString;
                }
                else{
                    if(dataMaior == "Invalid date" || typeof dataMaior == undefined || dataMaior == null){
                        return moment(data).format("DD/MM/YYYY HH:mm");
                    }
                    if(moment(d).isAfter(dataMaior) == true){
                        return moment(data).format("DD/MM/YYYY HH:mm");
                    }
                    return dataMaiorString;
                }
            },

            dateToString2Finais: function(data, requisicoes){
                var d = moment(data).format("YYYY-MM-DD HH:mm");
                var dataMaior = null;
                var dataMaiorString = null;
                if(requisicoes.length != 0){
                    dataMaior = moment(requisicoes[0].dataFim).format("YYYY-MM-DD HH:mm");
                    dataMaiorString = moment(requisicoes[0].dataFim).format("DD/MM/YYYY HH:mm")
                    for(var i=1; i<requisicoes.length; i++){
                        var dataProx = moment(requisicoes[i].dataFim).format("YYYY-MM-DD HH:mm");
                        if((dataMaior != "Invalid date" || typeof dataMaior == undefined )&& (dataProx != "Invalid date" || typeof dataProx == undefined)){
                            if(moment(dataProx).isValid() && moment(dataProx).isAfter(dataMaior)){
                                dataMaior = dataProx;
                                dataMaiorString = moment(requisicoes[i].dataFim).format("DD/MM/YYYY HH:mm");
                            }
                        }
                    }
                }

                if(d == "Invalid date" || typeof d == undefined){
                    if(dataMaior == "Invalid date" || typeof dataMaior == undefined || dataMaior == null){
                        return "Não definido"
                    }
                    return dataMaiorString;
                }
                else{
                    if(dataMaior == "Invalid date" || typeof dataMaior == undefined || dataMaior == null){
                        return moment(data).format("DD/MM/YYYY HH:mm");
                    }
                    if(moment(d).isAfter(dataMaior) == true){
                        return moment(data).format("DD/MM/YYYY HH:mm");
                    }
                    return dataMaiorString;
                }
            },
            estadoToStringRequisicao: function(estado){
                switch(estado){
                    case "preProducao":
                        return "Pré-produção. A aguardar datas."
                    case "emExecucao":
                        return "Requisição em execução."
                    case "finalizada":
                        return "Finalizada."
                }
            },
        
            estadoToString: function(estado){
                switch (estado){
                    case "preOrcamento":
                        return "Pré-orçamento. A calcular orçamento e data final.";
                    case "aAguardarResposta": 
                        return "A aguardar resposta do cliente.";
                    case "preProducao":
                        return "Pré-produção. O cliente aceitou o orçamento.";
                    case "producao":
                        return "Produção.";
                    case "finalizada":
                        return "Finalizada.";
                    case "associada":
                        return "Esta tarefa foi associada a si. Preencha-a.";
                    case "porAceitar":
                        return "Por aceitar. À espera da aceitação de um superior.";
                    case "aceite":
                        return "Foi aceite pelo superior. A aguardar data de inicio.";
                    case "recusada":
                        return "Recusada. Volte a estimar o tempo que demora na realização da tarefa";
                    case "emExecucao":
                        return "Em execução."
                    case "finalizada":
                        return "Finalizada."
                    default:
                        return "Erro";
                }
            },
        
            estadoToStringOD: function(estado){
                switch (estado){
                    case "associada":
                        return "Por preencher";
                    case "porAceitar":
                        return "Por aprovar";
                    case "aceite":
                        return "Aceite";
                    case "recusada":
                        return "Recusada";
                    case "emExecucao":
                        return "Em execução"
                    case "finalizada":
                        return "Finalizada"
                    case "preProducao":
                        return "A aguardar datas"
                    default:
                        return "Erro";
                }
            },

            cargoToString: function(role){
                switch (role){
                    case "user":
                        return "Funcionário";
                    case "userResponsavel":
                        return "Chefe de equipa";
                    case "admin":
                        return "Administrador";
                    default:
                        return "Erro";
                }
            },

            precoToString: function(numero){
                if(numero == 0)
                    return "Por definir";
                return parseFloat(numero).toFixed(2)+"€";
            },

            
            precoToStringSoma: function(numero1, numero2){
                if(numero1 + numero2 == 0)
                    return "Por definir";
                return parseFloat(numero1 + numero2).toFixed(2)+"€";
            },
            

            ifUR: function(options){
                if(u){
                    if(u.role === "admin" || u.role === "userResponsavel") {
                        return options.fn(this);
                    }
                }
                return options.inverse(this);
            },

            ifImAdmin: function(options){
                if(u.role === "admin") {
                    return options.fn(this);
                }
                return options.inverse(this);
            },

            ifSubmeteu: function(estado, options){
                if(estado === "associada" || estado === "recusada"){
                    return options.fn(this)
                }
                return options.inverse(this);
            },

            ifComecar: function(estado, options){
                if(estado === "aceite"){
                    return options.fn(this)
                }
                return options.inverse(this);
            },

            ifComecarRequest: function(requisicaoEstado, obraEstado, options){
                if(requisicaoEstado == "preProducao" && (obraEstado == "preProducao" || obraEstado == "producao")){
                    return options.fn(this)
                }
                return options.inverse(this);
            },

            ifValidar: function(estado, options){
                if(estado === "porAceitar"){
                    return options.fn(this)
                }
                return options.inverse(this);
            },

            ifTerminar: function(estado, options){
                if(estado === "emExecucao"){
                    return options.fn(this)
                }
                return options.inverse(this);
            },

            ifCanStart: function(estado, options){
                if(estado != "aAguardarResposta" && estado != "preOrcamento"){
                    return options.fn(this)
                }
                return options.inverse(this);
            },

            ifWaitForClient: function(estado, options){
                if(estado === "aAguardarResposta"){
                    return options.fn(this)
                }
                return options.inverse(this);
            },

            ifTerminou: function(estado, options){
                if(estado === "finalizada"){
                    return options.fn(this)
                }
                return options.inverse(this);
            },

            ifRecusada: function(estado, options){
                if(estado === "recusada"){
                    return options.fn(this)
                }
                return options.inverse(this);
            }

        }
    })
    app.engine('handlebars', hbs.engine)
    app.set('view engine', 'handlebars');
    

    //Public
    app.use(express.static(path.join(__dirname, "public")))
    
    //Mongoose
        mongoose.Promise = global.Promise
        mongoose.connect(db.mongoURI, {useCreateIndex: true, useNewUrlParser:true, useUnifiedTopology: true}).then(function(){
            console.log("MongoDB: conectado");
        }).catch(function(erro){
            console.log("MongoDB: erro - "+erro);
        })

//Rotas
    app.use('', user)
    app.use('', userResponsavel)


//Outros
const PORT = process.env.PORT || 8081;
app.listen(PORT, function(){
    console.log("Servidor a rodar")
})