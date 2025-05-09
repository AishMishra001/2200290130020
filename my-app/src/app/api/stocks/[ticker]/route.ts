import { type NextRequest, NextResponse } from "next/server"

const cache = new Map()
const CACHE_TTL = 60 * 1000

interface StockPrice {
  price: number
  lastUpdatedAt: string
}

export async function GET(request: NextRequest, { params }: { params: { ticker: string } }) {
  const ticker = params.ticker
  const searchParams = request.nextUrl.searchParams
  const minutes = searchParams.get("minutes") || "5"
  const aggregation = searchParams.get("aggregation") || "average"

  try {
    const priceHistory = await getMockStockPriceHistory(ticker, Number.parseInt(minutes))

    if (!priceHistory || priceHistory.length === 0) {
      return NextResponse.json(
        { error: "No price data available for the specified stock and time range" },
        { status: 404 },
      )
    }

    const averageStockPrice = calculateAverage(priceHistory.map((item) => item.price))

    return NextResponse.json({
      averageStockPrice,
      priceHistory,
    })
  } catch (error) {
    console.error(`Error generating stock data for ${ticker}:`, error)
    return NextResponse.json({ error: "Failed to generate stock data" }, { status: 500 })
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
