"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  type SelectChangeEvent,
  Paper,
  Grid,
  Tooltip as MuiTooltip,
} from "@mui/material"
import { ResponsiveContainer, Tooltip, XAxis, YAxis, ScatterChart, Scatter, Cell } from "recharts"

interface StockInfo {
  [ticker: string]: {
    name: string
    averagePrice?: number
    stdDev?: number
  }
}

interface CorrelationData {
  ticker1: string
  ticker2: string
  correlation: number
}

const colorScale = [
  "#053061", // Strong negative (dark blue)
  "#2166ac", // Negative (blue)
  "#4393c3", // Weak negative (light blue)
  "#92c5de", // Very weak negative (very light blue)
  "#f7f7f7", // Neutral (white)
  "#fddbc7", // Very weak positive (very light red)
  "#f4a582", // Weak positive (light red)
  "#d6604d", // Positive (red)
  "#b2182b", // Strong positive (dark red)
]

function getColorForCorrelation(correlation: number): string {
  // Map correlation from [-1, 1] to [0, 8] (colorScale index)
  const index = Math.round((correlation + 1) * 4)
  return colorScale[index]
}

export default function CorrelationPage() {
  const [stocks, setStocks] = useState<StockInfo>({})
  const [correlations, setCorrelations] = useState<CorrelationData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<string>("30")
  const [hoveredStock, setHoveredStock] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStocks() {
      try {
        const response = await fetch("/api/stocks")
        if (!response.ok) {
          throw new Error("Failed to fetch stocks")
        }
        const data = await response.json()

        // Convert to our format
        const stocksInfo: StockInfo = {}
        Object.entries(data.stocks || {}).forEach(([name, ticker]) => {
          stocksInfo[ticker as string] = { name }
        })

        setStocks(stocksInfo)
      } catch (err) {
        setError("Failed to load stocks. Please try again later.")
        console.error(err)
      }
    }

    fetchStocks()
  }, [])

  useEffect(() => {
    async function fetchCorrelations() {
      if (Object.keys(stocks).length < 2) return

      setLoading(true)
      setError(null)

      try {
        const tickers = Object.keys(stocks)
        const correlationData: CorrelationData[] = []

        // Calculate all pairwise correlations
        for (let i = 0; i < tickers.length; i++) {
          for (let j = 0; j < tickers.length; j++) {
            // Skip self-correlations (they're always 1)
            if (i === j) {
              correlationData.push({
                ticker1: tickers[i],
                ticker2: tickers[j],
                correlation: 1,
              })
              continue
            }

            // Fetch correlation data
            const response = await fetch(
              `/api/stockcorrelation?minutes=${timeRange}&ticker=${tickers[i]}&ticker=${tickers[j]}`,
            )

            if (!response.ok) {
              console.warn(`Failed to fetch correlation for ${tickers[i]} and ${tickers[j]}`)
              correlationData.push({
                ticker1: tickers[i],
                ticker2: tickers[j],
                correlation: 0,
              })
              continue
            }

            const data = await response.json()

            // Store correlation
            correlationData.push({
              ticker1: tickers[i],
              ticker2: tickers[j],
              correlation: data.correlation,
            })

            // Store average price and std dev for each stock
            if (!stocks[tickers[i]].averagePrice) {
              stocks[tickers[i]].averagePrice = data.stocks[tickers[i]].averagePrice

              // Calculate standard deviation
              const prices = data.stocks[tickers[i]].priceHistory.map((p: any) => p.price)
              stocks[tickers[i]].stdDev = calculateStdDev(prices)
            }

            if (!stocks[tickers[j]].averagePrice) {
              stocks[tickers[j]].averagePrice = data.stocks[tickers[j]].averagePrice

              // Calculate standard deviation
              const prices = data.stocks[tickers[j]].priceHistory.map((p: any) => p.price)
              stocks[tickers[j]].stdDev = calculateStdDev(prices)
            }
          }
        }

        setCorrelations(correlationData)
        setStocks({ ...stocks }) // Update with averages and std devs
      } catch (err) {
        setError("Failed to load correlation data. Please try again later.")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchCorrelations()
  }, [stocks.length, timeRange])

  const handleTimeRangeChange = (event: SelectChangeEvent) => {
    setTimeRange(event.target.value)
  }

  const calculateStdDev = (prices: number[]): number => {
    if (prices.length <= 1) return 0

    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / (prices.length - 1)
    return Math.sqrt(variance)
  }

  // Format data for the heatmap
  const formatHeatmapData = () => {
    const tickers = Object.keys(stocks)
    return correlations.map((corr) => ({
      x: tickers.indexOf(corr.ticker1),
      y: tickers.indexOf(corr.ticker2),
      z: corr.correlation,
      ticker1: corr.ticker1,
      ticker2: corr.ticker2,
    }))
  }

  if (loading && Object.keys(stocks).length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Typography color="error" variant="h5">
          {error}
        </Typography>
      </Box>
    )
  }

  const tickers = Object.keys(stocks)
  const heatmapData = formatHeatmapData()

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box display="flex" alignItems="center" mb={4}>
        <Button variant="outlined" component={Link} href="/" sx={{ mr: 2 }}>
          Back to Home
        </Button>
        <Typography variant="h4" component="h1">
          Stock Correlation Heatmap
        </Typography>
      </Box>

      <Box display="flex" justifyContent="flex-end" mb={3}>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel id="time-range-label">Time Range</InputLabel>
          <Select labelId="time-range-label" value={timeRange} label="Time Range" onChange={handleTimeRangeChange}>
            <MenuItem value="5">Last 5 minutes</MenuItem>
            <MenuItem value="15">Last 15 minutes</MenuItem>
            <MenuItem value="30">Last 30 minutes</MenuItem>
            <MenuItem value="60">Last 1 hour</MenuItem>
            <MenuItem value="120">Last 2 hours</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Box height={600} position="relative">
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
              <CircularProgress />
            </Box>
          ) : (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 60, right: 20, bottom: 20, left: 60 }}>
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="ticker1"
                    domain={[0, tickers.length - 1]}
                    tickCount={tickers.length}
                    tickFormatter={(value) => tickers[value] || ""}
                    label={{ value: "Stocks", position: "bottom", offset: 0 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="ticker2"
                    domain={[0, tickers.length - 1]}
                    tickCount={tickers.length}
                    tickFormatter={(value) => tickers[value] || ""}
                    label={{ value: "Stocks", angle: -90, position: "left" }}
                  />
                  <Tooltip
                    formatter={(value, name, props) => {
                      if (name === "z") {
                        const { ticker1, ticker2 } = props.payload
                        return [`Correlation: ${value.toFixed(4)}`, `${ticker1} vs ${ticker2}`]
                      }
                      return [value, name]
                    }}
                  />
                  <Scatter data={heatmapData} shape="square" fill="#8884d8">
                    {heatmapData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={getColorForCorrelation(entry.z)}
                        width={600 / tickers.length}
                        height={600 / tickers.length}
                        onMouseEnter={() => setHoveredStock(entry.ticker1)}
                        onMouseLeave={() => setHoveredStock(null)}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>

              {/* Color Legend */}
              <Box
                position="absolute"
                bottom={10}
                right={10}
                display="flex"
                flexDirection="column"
                bgcolor="white"
                p={1}
                border="1px solid #ddd"
                borderRadius={1}
              >
                <Typography variant="subtitle2" gutterBottom>
                  Correlation Strength
                </Typography>
                <Box display="flex" alignItems="center">
                  <Box width={20} height={20} bgcolor={colorScale[0]} mr={1} />
                  <Typography variant="caption">-1.0 (Strong Negative)</Typography>
                </Box>
                <Box display="flex" alignItems="center">
                  <Box width={20} height={20} bgcolor={colorScale[2]} mr={1} />
                  <Typography variant="caption">-0.5 (Moderate Negative)</Typography>
                </Box>
                <Box display="flex" alignItems="center">
                  <Box width={20} height={20} bgcolor={colorScale[4]} mr={1} />
                  <Typography variant="caption">0 (No Correlation)</Typography>
                </Box>
                <Box display="flex" alignItems="center">
                  <Box width={20} height={20} bgcolor={colorScale[6]} mr={1} />
                  <Typography variant="caption">0.5 (Moderate Positive)</Typography>
                </Box>
                <Box display="flex" alignItems="center">
                  <Box width={20} height={20} bgcolor={colorScale[8]} mr={1} />
                  <Typography variant="caption">1.0 (Strong Positive)</Typography>
                </Box>
              </Box>
            </>
          )}
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {tickers.map((ticker) => (
          <Grid item xs={12} sm={6} md={4} key={ticker}>
            <MuiTooltip
              title={
                <Box p={1}>
                  <Typography variant="body2">
                    <strong>Average Price:</strong> ${stocks[ticker].averagePrice?.toFixed(2) || "N/A"}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Standard Deviation:</strong> ${stocks[ticker].stdDev?.toFixed(2) || "N/A"}
                  </Typography>
                </Box>
              }
            >
              <Paper
                elevation={hoveredStock === ticker ? 6 : 2}
                sx={{
                  p: 2,
                  bgcolor: hoveredStock === ticker ? "#f0f7ff" : "white",
                  transition: "all 0.2s ease-in-out",
                  cursor: "pointer",
                }}
              >
                <Typography variant="h6">{ticker}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {stocks[ticker].name}
                </Typography>
              </Paper>
            </MuiTooltip>
          </Grid>
        ))}
      </Grid>
    </Container>
  )
}
