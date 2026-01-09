import { useState, useMemo } from 'react';
import { format, subDays, subWeeks, subMonths, startOfDay, startOfWeek, startOfMonth, isSameDay, isSameWeek, isSameMonth } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { TrendingUp, TrendingDown, ShoppingCart, IndianRupee } from 'lucide-react';
import type { Order } from '@/hooks/useOrders';

type TimeRange = 'daily' | 'weekly' | 'monthly';

interface OrdersChartProps {
  orders: Order[];
}

const chartConfig = {
  orders: {
    label: "Orders",
    color: "hsl(var(--primary))",
  },
  revenue: {
    label: "Revenue",
    color: "hsl(var(--secondary))",
  },
};

export default function OrdersChart({ orders }: OrdersChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('daily');

  const chartData = useMemo(() => {
    const now = new Date();
    let data: { label: string; orders: number; revenue: number; date: Date }[] = [];

    if (timeRange === 'daily') {
      // Last 14 days
      for (let i = 13; i >= 0; i--) {
        const date = subDays(now, i);
        const dayStart = startOfDay(date);
        const dayOrders = orders.filter(o => 
          o.created_at && isSameDay(new Date(o.created_at), dayStart)
        );
        const paidOrders = dayOrders.filter(o => o.status === 'paid' || o.status === 'completed');
        
        data.push({
          label: format(date, 'MMM d'),
          orders: dayOrders.length,
          revenue: paidOrders.reduce((sum, o) => sum + Number(o.total_amount), 0),
          date,
        });
      }
    } else if (timeRange === 'weekly') {
      // Last 8 weeks
      for (let i = 7; i >= 0; i--) {
        const date = subWeeks(now, i);
        const weekStart = startOfWeek(date, { weekStartsOn: 1 });
        const weekOrders = orders.filter(o => 
          o.created_at && isSameWeek(new Date(o.created_at), weekStart, { weekStartsOn: 1 })
        );
        const paidOrders = weekOrders.filter(o => o.status === 'paid' || o.status === 'completed');
        
        data.push({
          label: `Week ${format(weekStart, 'MMM d')}`,
          orders: weekOrders.length,
          revenue: paidOrders.reduce((sum, o) => sum + Number(o.total_amount), 0),
          date: weekStart,
        });
      }
    } else {
      // Last 6 months
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(now, i);
        const monthStart = startOfMonth(date);
        const monthOrders = orders.filter(o => 
          o.created_at && isSameMonth(new Date(o.created_at), monthStart)
        );
        const paidOrders = monthOrders.filter(o => o.status === 'paid' || o.status === 'completed');
        
        data.push({
          label: format(date, 'MMM yyyy'),
          orders: monthOrders.length,
          revenue: paidOrders.reduce((sum, o) => sum + Number(o.total_amount), 0),
          date: monthStart,
        });
      }
    }

    return data;
  }, [orders, timeRange]);

  const stats = useMemo(() => {
    const currentPeriod = chartData.slice(-1)[0];
    const previousPeriod = chartData.slice(-2, -1)[0];

    const orderChange = previousPeriod?.orders 
      ? ((currentPeriod?.orders || 0) - previousPeriod.orders) / previousPeriod.orders * 100 
      : 0;
    const revenueChange = previousPeriod?.revenue 
      ? ((currentPeriod?.revenue || 0) - previousPeriod.revenue) / previousPeriod.revenue * 100 
      : 0;

    const totalOrders = chartData.reduce((sum, d) => sum + d.orders, 0);
    const totalRevenue = chartData.reduce((sum, d) => sum + d.revenue, 0);

    return { orderChange, revenueChange, totalOrders, totalRevenue };
  }, [chartData]);

  return (
    <div className="space-y-6">
      {/* Time Range Toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Orders Overview</h3>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {(['daily', 'weekly', 'monthly'] as TimeRange[]).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTimeRange(range)}
              className="capitalize"
            >
              {range}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Period Orders</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalOrders}</p>
              </div>
              <div className="p-2 rounded-lg bg-primary/10">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className={`flex items-center gap-1 mt-2 text-sm ${stats.orderChange >= 0 ? 'text-secondary' : 'text-destructive'}`}>
              {stats.orderChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span>{Math.abs(stats.orderChange).toFixed(1)}% vs previous</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Period Revenue</p>
                <p className="text-2xl font-bold text-foreground">₹{stats.totalRevenue.toLocaleString()}</p>
              </div>
              <div className="p-2 rounded-lg bg-secondary/10">
                <IndianRupee className="h-5 w-5 text-secondary" />
              </div>
            </div>
            <div className={`flex items-center gap-1 mt-2 text-sm ${stats.revenueChange >= 0 ? 'text-secondary' : 'text-destructive'}`}>
              {stats.revenueChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span>{Math.abs(stats.revenueChange).toFixed(1)}% vs previous</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Orders/{timeRange === 'daily' ? 'Day' : timeRange === 'weekly' ? 'Week' : 'Month'}</p>
                <p className="text-2xl font-bold text-foreground">{(stats.totalOrders / chartData.length).toFixed(1)}</p>
              </div>
              <div className="p-2 rounded-lg bg-muted">
                <ShoppingCart className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Revenue/{timeRange === 'daily' ? 'Day' : timeRange === 'weekly' ? 'Week' : 'Month'}</p>
                <p className="text-2xl font-bold text-foreground">₹{(stats.totalRevenue / chartData.length).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
              <div className="p-2 rounded-lg bg-muted">
                <IndianRupee className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Orders Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="label" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar 
                  dataKey="orders" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                  name="Orders"
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Revenue Area Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="label" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent formatter={(value) => `₹${Number(value).toLocaleString()}`} />} 
                />
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(var(--secondary))" 
                  fill="url(#revenueGradient)"
                  strokeWidth={2}
                  name="Revenue"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
