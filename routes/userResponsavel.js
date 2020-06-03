const express = require('express')
const router = express.Router()


router.get('/obras/add', function(req, res){
    res.render("usersResponsaveis/novaObra")
})

router.post('/obras/add', function(req, res){
    
})


module.exports = router