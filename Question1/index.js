const express = require("express") ; 
const axios = require("axios");

const app = express();
const PORT = 9876;



app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});