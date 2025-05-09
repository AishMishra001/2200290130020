const express = require("express") ; 
const axios = require("axios");
require("dotenv").config();


const app = express();
const PORT = 9876;
const WINDOW_SIZE = 10;
let windowStore = [];

const validIds = ['p', 'f', 'e', 'r'];

const idToEndpoint = {
  p: 'primes',
  f: 'fibo',
  e: 'even',
  r: 'rand',
};

const getNumbersFromTestServer = async (type) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 500);

  try {
    const endpoint = idToEndpoint[type];
    const response = await axios.get(
      `http://20.244.56.144/evaluation-service/${endpoint}`,
      {
        signal: controller.signal,
        timeout: 500,
        headers: {
          Authorization: `Bearer ${process.env.TOKEN}`
        },
      }
    );
    clearTimeout(timeout);
    return response.data.numbers || [];
  } catch (error) {
    clearTimeout(timeout);
    console.log("Error or timeout fetching:", type, error.message);
    return [];
  }
};



app.get("/numbers/:numberid", async (req, res) => {
  const { numberid } = req.params;

  if (!validIds.includes(numberid)) {
    return res.status(400).json({ error: "Invalid number ID" });
  }

  const windowPrevState = [...windowStore];

  const apiNumbers = await getNumbersFromTestServer(numberid);

  for (const num of apiNumbers) {
    if (!windowStore.includes(num)) {
      windowStore.push(num);
      if (windowStore.length > WINDOW_SIZE) {
        windowStore.shift();
      }
    }
  }

  const avg =
    windowStore.length > 0
      ? parseFloat(
          (windowStore.reduce((a, b) => a + b, 0) / windowStore.length).toFixed(2)
        )
      : 0;

  res.json({
    windowPrevState,
    windowCurrState: windowStore,
    numbers: apiNumbers,
    avg,
  });
});



app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});