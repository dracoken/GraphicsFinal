const express = require('express')
const app = express()
const port = 3000

const HELP_STRING = "";


app.get('/favicon.ico', (req, res) => res.sendStatus(204));
app.get('/help', (req, res) => res.send(HELP_STRING));
app.use('/', express.static(__dirname + '/'));

// app.get("/", (req, res) => {
//   console.log("test");
//   res.send("Hello World!");
//   //res.sendFile(__dirname + "/lab10.html");
// });

app.listen(port, () => {
  console.log(`WebGLServer listening on port ${port}`)
})

