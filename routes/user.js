const express = require('express')
const router = express.Router()

router.get('/dashboard', function(req, res){
    res.send("Página principal da app")
})

router.get('/obras', function(req, res){
    res.send("Página de obras2")
})


module.exports = router