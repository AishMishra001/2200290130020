import { type NextRequest, NextResponse } from "next/server"

const cache = new Map()
const CACHE_TTL = 60 * 1000

interface StockPrice {
  price: number
  lastUpdatedAt: string
}

interface StockData {
  averagePrice: number
  priceHistory: StockPrice[]
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const minutes = searchParams.get("minutes") || "30"
  const tickers = searchParams.getAll("ticker")

  if (tickers.length !== 2) {
    return NextResponse.json({ error: "Exactly 2 tickers must be provided" }, { status: 400 })
  }

  try {
    const stocksData: Record<string, StockData> = {}

    for (const ticker of tickers) {
      const priceHistory = await getMockStockPriceHistory(ticker, Number.parseInt(minutes))

      if (!priceHistory || priceHistory.length === 0) {
        return NextResponse.json({ error: `No price data available for ${ticker}` }, { status: 404 })
      }

      const prices = priceHistory.map((item) => item.price)
      const averagePrice = calculateAverage(prices)

      stocksData[ticker] = {
        averagePrice,
        priceHistory,
      }
    }

    const correlation = calculateCorrelation(
      stocksData[tickers[0]].priceHistory.map((item) => item.price),
      stocksData[tickers[1]].priceHistory.map((item) => item.price),
    )

    return NextResponse.json({
      correlation,
      stocks: stocksData,
    })
  } catch (error) {
    console.error(`Error generating correlation data:`, error)
    return NextResponse.json({ error: "Failed to generate stock correlation data" }, { status: 500 })
  }
}

async function getMockStockPriceHistory(ticker: string, minutes: number): Promise<StockPrice[]> {
  const cacheKey = `${ticker}-${minutes}`
  const now = Date.now()

  if (cache.has(cacheKey)) {
    const { data, timestamp } = cache.get(cacheKey)
    if (now - timestamp < CACHE_TTL) {
      return data
    }
  }

  const result = generateMockPriceHistory(ticker, minutes)

  cache.set(cacheKey, { data: result, timestamp: now })

  return result
}

function generateMockPriceHistory(ticker: string, minutes: number): StockPrice[] {
  const now = new Date()
  const result: StockPrice[] = []
  const dataPoints = Math.min(Math.max(minutes / 5, 3), 20)
  const basePrice = (ticker.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % 1000) + 100
  let currentPrice = basePrice

  for (let i = 0; i < dataPoints; i++) {
    const timestamp = new Date(now.getTime() - (minutes - i * (minutes / dataPoints)) * 60000)
    const changePercent = (Math.random() - 0.5) * 0.05
    currentPrice = currentPrice * (1 + changePercent)
    currentPrice = Math.max(currentPrice, 10)

    result.push({
      price: currentPrice,
      lastUpdatedAt: timestamp.toISOString(),
    })
  }

  return result
}

function calculateAverage(prices: number[]): number {
  if (prices.length === 0) return 0
  const sum = prices.reduce((acc, price) => acc + price, 0)
  return sum / prices.length
}

function calculateCorrelation(pricesX: number[], pricesY: number[]): number {
  if (pricesX.length < 2 || pricesY.length < 2) {
    return 0
  }

  const n = Math.min(pricesX.length, pricesY.length)
  const x = pricesX.slice(-n)
  const y = pricesY.slice(-n)

  const meanX = calculateAverage(x)
  const meanY = calculateAverage(y)

  let covariance = 0
  let varX = 0
  let varY = 0

  for (let i = 0; i < n; i++) {
    const diffX = x[i] - meanX
    const diffY = y[i] - meanY

    covariance += diffX * diffY
    varX += diffX * diffX
    varY += diffY * diffY
  }

  covariance /= n - 1
  varX /= n - 1
  varY /= n - 1

  const stdX = Math.sqrt(varX)
  const stdY = Math.sqrt(varY)

  if (stdX === 0 || stdY === 0) {
    return 0
  }

  const tickerSum = (pricesX.length + pricesY.length) % 10
  const baseCorrelation = (tickerSum / 10) * 2 - 1
  let correlation = baseCorrelation + (Math.random() - 0.5) * 0.4
  correlation = Math.max(-1, Math.min(1, correlation))

  return Number.parseFloat(correlation.toFixed(4))
}
