"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Container, Typography, Box, Card, CardContent, Grid, Button, CircularProgress } from "@mui/material"

export default function Home() {
  const [stocks, setStocks] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStocks() {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch("/api/stocks", {
          cache: "no-store",
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch stocks: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        setStocks(data.stocks || {})
      } catch (err) {
        console.error("Error in fetchStocks:", err)
        setError("Failed to load stocks. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchStocks()
  }, [])

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" flexDirection="column">
        <Typography color="error" variant="h5" gutterBottom>
          {error}
        </Typography>
        <Button variant="contained" color="primary" onClick={() => window.location.reload()} sx={{ mt: 2 }}>
          Retry
        </Button>
      </Box>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom align="center">
        Stock Price Aggregation
      </Typography>

      <Box display="flex" justifyContent="center" gap={2} mb={4}>
        <Button variant="contained" color="primary" component={Link} href="/correlation">
          View Correlation Heatmap
        </Button>
      </Box>

      <Typography variant="h5" component="h2" gutterBottom>
        Available Stocks
      </Typography>

      <Grid container spacing={2}>
        {Object.entries(stocks).map(([name, ticker]) => (
          <Grid item xs={12} sm={6} md={4} key={ticker}>
            <Card>
              <CardContent>
                <Typography variant="h6" component="div">
                  {name}
                </Typography>
                <Typography color="text.secondary">{ticker}</Typography>
                <Box mt={2}>
                  <Button variant="outlined" component={Link} href={`/stocks/${ticker}`}>
                    View Details
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  )
}
