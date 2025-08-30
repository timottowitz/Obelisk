'use client';

import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';

import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';

interface ContractAreaChartProps {
  data: Array<Record<string, any>>;
  categories: string[];
  colors?: string[];
  showLegend?: boolean;
}

export function ContractAreaChart({ 
  data, 
  categories, 
  colors = ['var(--chart-1)', 'var(--chart-2)'],
  showLegend = false 
}: ContractAreaChartProps) {
  const chartConfig = categories.reduce((acc, cat, index) => {
    acc[cat] = {
      label: cat.charAt(0).toUpperCase() + cat.slice(1),
      color: colors[index] || `var(--chart-${index + 1})`
    };
    return acc;
  }, {} as ChartConfig);

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-[250px] w-full"
    >
      <AreaChart
        data={data}
        margin={{
          left: 12,
          right: 12,
        }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => value.slice(0, 3)}
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent indicator="dot" />}
        />
        {categories.map((category, index) => (
          <Area
            key={category}
            dataKey={category}
            type="natural"
            fill={colors[index] || `var(--chart-${index + 1})`}
            fillOpacity={0.4}
            stroke={colors[index] || `var(--chart-${index + 1})`}
            stackId="a"
          />
        ))}
        {showLegend && <ChartLegend content={<ChartLegendContent />} />}
      </AreaChart>
    </ChartContainer>
  );
}