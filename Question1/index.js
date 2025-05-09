const express = require("express") ; 
const axios = require("axios");

const app = express();
const PORT = 9876;
const WINDOW_SIZE = 10;
let windowStore = [];

const validIds = ['p', 'f', 'e', 'r'];

const getNumbersFromTestServer = async (type) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 500);

  try {
    const response = await axios.get(`http://20.244.56.144/numbers/${type}`, {
      signal: controller.signal,
      timeout: 500,
    });
    clearTimeout(timeout);
    return response.data.numbers || [];
  } catch (error) {
    clearTimeout(timeout);
    console.log("Error or timeout fetching:", type);
    return [];
  }
};


app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});