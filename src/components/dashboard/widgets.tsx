"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown } from "lucide-react"

// Data Text Cards with Circular Progress
export function DataTextCard({ 
  value, 
  label, 
  description, 
  percentage
}: { 
  value: string
  label: string
  description: string
  percentage: number
}) {
  return (
    <Card variant="depth">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-center mb-4">
          <div className="relative w-24 h-24">
            {/* Circular Progress Background */}
            <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-muted/20"
                stroke="currentColor"
                strokeWidth="3"
                fill="transparent"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-primary"
                stroke="currentColor"
                strokeWidth="3"
                fill="transparent"
                strokeDasharray={`${percentage}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            {/* Center Value */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-foreground">{value}</span>
            </div>
          </div>
        </div>
        <CardTitle className="text-center text-sm font-medium text-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-muted-foreground text-center mb-2">{description}</p>
        <p className="text-xs text-muted-foreground text-center">{description}</p>
      </CardContent>
    </Card>
  )
}

// Lorem Ipsum Card with Percentage
export function PercentageCard({ 
  title, 
  subtitle, 
  percentage, 
  description 
}: { 
  title: string
  subtitle: string
  percentage: number
  description: string
}) {
  return (
    <Card variant="depth">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-foreground">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-bold text-primary mb-4">{percentage}%</div>
        <p className="text-xs text-muted-foreground mb-2">{description}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

// Lorem Ipsum Card with Progress Bars
export function ProgressBarsCard({ 
  title, 
  subtitle, 
  progressData 
}: { 
  title: string
  subtitle: string
  progressData: Array<{ label: string; value: number; color: string }>
}) {
  return (
    <Card variant="depth">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-foreground">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {progressData.map((item, index) => (
          <div key={index} className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">{item.label}</span>
              <span className="text-xs text-foreground font-medium">{item.value}%</span>
            </div>
            <div className="w-full bg-muted/20 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${item.color}`}
                style={{ width: `${item.value}%` }}
              ></div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// Activities Card
export function ActivitiesCard({ 
  title, 
  subtitle, 
  items 
}: { 
  title: string
  subtitle: string
  items: Array<{ label: string; value: string }>
}) {
  return (
    <Card variant="depth">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-foreground">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">{item.label}</span>
              <Button variant="ghost" size="sm" className="h-6 px-2">
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{item.value}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// Circular Progress Indicators Card
export function CircularProgressCard({ 
  title, 
  subtitle, 
  progressData 
}: { 
  title: string
  subtitle: string
  progressData: Array<{ percentage: number; label: string; color: string }>
}) {
  return (
    <Card variant="depth">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-foreground">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent className="grid grid-cols-5 gap-4">
        {progressData.map((item, index) => (
          <div key={index} className="flex flex-col items-center space-y-2">
            <div className="relative w-12 h-12">
              <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-muted/20"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="transparent"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={item.color}
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="transparent"
                  strokeDasharray={`${item.percentage}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-foreground">{item.percentage}%</span>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <div className={`w-1 h-1 rounded-full ${item.color.replace('text-', 'bg-')}`}></div>
              <span className="text-xs text-muted-foreground">Data text</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
