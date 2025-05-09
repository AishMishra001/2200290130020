"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  type SelectChangeEvent,
  Paper,
} from "@mui/material"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import { format, parseISO } from "date-fns"

interface StockPrice {
  price: number
  lastUpdatedAt: string
}

interface StockData {
  averageStockPrice: number
  priceHistory: StockPrice[]
}

export default function StockPage() {
  const { ticker } = useParams<{ ticker: string }>()
  const [stockData, setStockData] = useState<StockData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<string>("30")
  const [stockName, setStockName] = useState<string>("")

  useEffect(() => {
    async function fetchStockName() {
      try {
        const response = await fetch("/api/stocks")
        if (!response.ok) {
          throw new Error("Failed to fetch stocks")
        }
        const data = await response.json()
        const stocks = data.stocks || {}

        // Find the stock name by ticker
        const name = Object.entries(stocks).find(([name, symbol]) => symbol === ticker)?.[0] || ticker
        setStockName(name)
      } catch (err) {
        console.error("Error fetching stock name:", err)
      }
    }

    fetchStockName()
  }, [ticker])

  useEffect(() => {
    async function fetchStockData() {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/stocks/${ticker}?minutes=${timeRange}&aggregation=average`)
        if (!response.ok) {
          throw new Error("Failed to fetch stock data")
        }
        const data = await response.json()
        setStockData(data)
      } catch (err) {
        setError("Failed to load stock data. Please try again later.")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    if (ticker) {
      fetchStockData()
    }
  }, [ticker, timeRange])

  const handleTimeRangeChange = (event: SelectChangeEvent) => {
    setTimeRange(event.target.value)
  }

  const formatData = (data: StockData | null) => {
    if (!data || !data.priceHistory) return []

    return data.priceHistory.map((item) => ({
      ...item,
      formattedDate: format(parseISO(item.lastUpdatedAt), "MMM dd, HH:mm:ss"),
    }))
  }

  const formattedData = formatData(stockData)

  if (loading) {
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

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box display="flex" alignItems="center" mb={4}>
        <Button variant="outlined" component={Link} href="/" sx={{ mr: 2 }}>
          Back to Home
        </Button>
        <Typography variant="h4" component="h1">
          {stockName} ({ticker})
        </Typography>
      </Box>

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          Stock Price History
        </Typography>

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
        <Box height={400}>
          {formattedData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formattedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="formattedDate" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => [`$${value.toFixed(2)}`, "Price"]}
                  labelFormatter={(label) => `Time: ${label}`}
                />
                <Legend />
                <Line type="monotone" dataKey="price" stroke="#8884d8" activeDot={{ r: 8 }} name="Stock Price" />
                <ReferenceLine
                  y={stockData?.averageStockPrice}
                  stroke="red"
                  strokeDasharray="3 3"
                  label={{
                    value: `Avg: $${stockData?.averageStockPrice.toFixed(2)}`,
                    position: "insideBottomRight",
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
              <Typography>No price data available for the selected time range</Typography>
            </Box>
          )}
        </Box>
      </Paper>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Price Statistics
          </Typography>
          <Box display="flex" flexDirection="column" gap={1}>
            <Typography>
              <strong>Average Price:</strong> ${stockData?.averageStockPrice.toFixed(2)}
            </Typography>
            <Typography>
              <strong>Latest Price:</strong> ${formattedData[formattedData.length - 1]?.price.toFixed(2) || "N/A"}
            </Typography>
            <Typography>
              <strong>Data Points:</strong> {formattedData.length}
            </Typography>
            {formattedData.length > 0 && (
              <>
                <Typography>
                  <strong>Highest Price:</strong> ${Math.max(...formattedData.map((d) => d.price)).toFixed(2)}
                </Typography>
                <Typography>
                  <strong>Lowest Price:</strong> ${Math.min(...formattedData.map((d) => d.price)).toFixed(2)}
                </Typography>
              </>
            )}
          </Box>
        </CardContent>
      </Card>
    </Container>
  )
}
