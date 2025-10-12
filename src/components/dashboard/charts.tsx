"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

// Line Chart Component
export function LineChartCard({ 
  title, 
  subtitle, 
  timeRanges, 
  activeRange,
  onRangeChange,
  data 
}: { 
  title: string
  subtitle: string
  timeRanges: string[]
  activeRange: string
  onRangeChange: (range: string) => void
  data: Array<{ name: string; values: number[]; color: string }>
}) {
  const maxValue = Math.max(...data.flatMap(d => d.values))
  const minValue = Math.min(...data.flatMap(d => d.values))
  const range = maxValue - minValue

  return (
    <Card variant="depth">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium text-foreground">{title}</CardTitle>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <div className="flex gap-1">
            {timeRanges.map((range) => (
              <Button
                key={range}
                variant={activeRange === range ? "default" : "ghost"}
                size="sm"
                onClick={() => onRangeChange(range)}
                className="text-xs h-7"
              >
                {range}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-48 relative">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-muted-foreground">
            <span>70</span>
            <span>50</span>
            <span>30</span>
            <span>10</span>
          </div>
          
          {/* Chart area */}
          <div className="ml-8 h-full relative">
            {/* Grid lines */}
            <div className="absolute inset-0">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="absolute w-full border-t border-border/20"
                  style={{ top: `${i * 25}%` }}
                ></div>
              ))}
            </div>
            
            {/* Chart lines */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              {data.map((dataset, datasetIndex) => {
                const points = dataset.values.map((value, index) => {
                  const x = (index / (dataset.values.length - 1)) * 100
                  const y = 100 - ((value - minValue) / range) * 100
                  return `${x},${y}`
                }).join(' ')
                
                return (
                  <polyline
                    key={datasetIndex}
                    fill="none"
                    stroke={`var(--color-${dataset.color})`}
                    strokeWidth="2"
                    points={points}
                    className="drop-shadow-sm"
                  />
                )
              })}
            </svg>
          </div>
          
          {/* Legend */}
          <div className="absolute top-2 right-2 flex gap-4">
            {data.map((dataset, index) => (
              <div key={index} className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full bg-${dataset.color}`}></div>
                <span className="text-xs text-muted-foreground">{dataset.name}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Bar Grid Visualization
export function BarGridCard({ 
  title, 
  subtitle, 
  data 
}: { 
  title: string
  subtitle: string
  data: Array<{ value: number; color: string }>
}) {
  return (
    <Card variant="depth">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-foreground">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-10 gap-1 h-48">
          {data.map((item, index) => (
            <div
              key={index}
              className={`rounded-sm transition-all duration-300 hover:scale-110 ${item.color}`}
              style={{ height: `${item.value}%` }}
            ></div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
