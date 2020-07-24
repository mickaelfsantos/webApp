if(process.env.NODE_ENV == "production"){
    console.log("ola")
    module.exports = {mongoURI: "mongodb+srv://admin:123123123@cluster0.ua38y.mongodb.net/<dbname>?retryWrites=true&w=majority/webApp"}
}
else{
    module.exports = {mongoURI: "mongodb://localhost/webApp"}
}