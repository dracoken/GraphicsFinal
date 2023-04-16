const express = require('express');
const app = express();
const port = 3000;

app.get('/',(req,res) => {
    res.status(200);
    res.send("test landing page");
});

app.listen(port, () => {
    console.log("listiening on port " + port);
}); 
