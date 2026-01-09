import { useState, useMemo } from 'react';
import { format, subDays, subWeeks, subMonths, startOfDay, startOfWeek, startOfMonth, isSameDay, isSameWeek, isSameMonth } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { TrendingUp, TrendingDown, ShoppingCart, IndianRupee } from 'lucide-react';
import type { OrderWithItems } from '@/hooks/useOrders';

type TimeRange = 'daily' | 'weekly' | 'monthly';

interface OrdersChartProps {
  orders: OrderWithItems[];
}

const CATEGORY_COLORS: Record<string, string> = {
  'Pune University Notes': 'hsl(280, 80%, 55%)',    // Vibrant Purple
  'Engineering Notes': 'hsl(190, 95%, 42%)',        // Cyan/Teal
  'IIT Notes': 'hsl(145, 70%, 42%)',                // Emerald Green
  'Competitive Exam Notes': 'hsl(35, 95%, 55%)',    // Bright Orange
  'Others': 'hsl(350, 85%, 55%)',                   // Coral Red
};

const chartConfig = {
  orders: {
    label: "Orders",
    color: "hsl(var(--primary))",
  },
  revenue: {
    label: "Revenue",
    color: "hsl(var(--secondary))",
  },
  'Pune University Notes': {
    label: "Pune University",
    color: CATEGORY_COLORS['Pune University Notes'],
  },
  'Engineering Notes': {
    label: "Engineering",
    color: CATEGORY_COLORS['Engineering Notes'],
  },
  'IIT Notes': {
    label: "IIT",
    color: CATEGORY_COLORS['IIT Notes'],
  },
  'Competitive Exam Notes': {
    label: "Competitive Exam",
    color: CATEGORY_COLORS['Competitive Exam Notes'],
  },
  'Others': {
    label: "Others",
    color: CATEGORY_COLORS['Others'],
  },
};

export default function OrdersChart({ orders }: OrdersChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('daily');

  // Get unique categories from order items
  const categories = useMemo(() => {
    const cats = new Set<string>();
    orders.forEach(order => {
      order.order_items?.forEach(item => {
        if (item.products?.category) {
          cats.add(item.products.category);
        }
      });
    });
    return Array.from(cats).sort();
  }, [orders]);

  const chartData = useMemo(() => {
    const now = new Date();

    const data: Record<string, any>[] = [];

    const getOrdersForPeriod = (filterFn: (orderDate: Date) => boolean) => {
      return orders.filter(o => o.created_at && filterFn(new Date(o.created_at)));
    };

    const getCategoryCount = (periodOrders: OrderWithItems[], category: string) => {
      let count = 0;
      periodOrders.forEach(order => {
        order.order_items?.forEach(item => {
          if (item.products?.category === category) {
            count++;
          }
        });
      });
      return count;
    };

    if (timeRange === 'daily') {
      for (let i = 13; i >= 0; i--) {
        const date = subDays(now, i);
        const dayStart = startOfDay(date);
        const dayOrders = getOrdersForPeriod(d => isSameDay(d, dayStart));
        const paidOrders = dayOrders.filter(o => o.status === 'paid' || o.status === 'completed');
        
        const dataPoint: Record<string, any> = {
          label: format(date, 'MMM d'),
          orders: dayOrders.length,
          revenue: paidOrders.reduce((sum, o) => sum + Number(o.total_amount), 0),
          date,
        };

        categories.forEach(cat => {
          dataPoint[cat] = getCategoryCount(dayOrders, cat);
        });

        data.push(dataPoint);
      }
    } else if (timeRange === 'weekly') {
      for (let i = 7; i >= 0; i--) {
        const date = subWeeks(now, i);
        const weekStart = startOfWeek(date, { weekStartsOn: 1 });
        const weekOrders = getOrdersForPeriod(d => isSameWeek(d, weekStart, { weekStartsOn: 1 }));
        const paidOrders = weekOrders.filter(o => o.status === 'paid' || o.status === 'completed');
        
        const dataPoint: Record<string, any> = {
          label: format(weekStart, 'MMM d'),
          orders: weekOrders.length,
          revenue: paidOrders.reduce((sum, o) => sum + Number(o.total_amount), 0),
          date: weekStart,
        };

        categories.forEach(cat => {
          dataPoint[cat] = getCategoryCount(weekOrders, cat);
        });

        data.push(dataPoint);
      }
    } else {
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(now, i);
        const monthStart = startOfMonth(date);
        const monthOrders = getOrdersForPeriod(d => isSameMonth(d, monthStart));
        const paidOrders = monthOrders.filter(o => o.status === 'paid' || o.status === 'completed');
        
        const dataPoint: Record<string, any> = {
          label: format(date, 'MMM yyyy'),
          orders: monthOrders.length,
          revenue: paidOrders.reduce((sum, o) => sum + Number(o.total_amount), 0),
          date: monthStart,
        };

        categories.forEach(cat => {
          dataPoint[cat] = getCategoryCount(monthOrders, cat);
        });

        data.push(dataPoint);
      }
    }

    return data;
  }, [orders, timeRange, categories]);

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

  // Category distribution for pie chart
  const categoryPieData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    
    chartData.forEach(dataPoint => {
      categories.forEach(cat => {
        categoryTotals[cat] = (categoryTotals[cat] || 0) + (dataPoint[cat] || 0);
      });
    });

    const total = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);
    
    return Object.entries(categoryTotals)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({
        name,
        value,
        percentage: total > 0 ? ((value / total) * 100).toFixed(1) : '0',
      }));
  }, [chartData, categories]);

  return (
    <div className="space-y-6">
      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-4">
        <h3 className="text-lg font-semibold text-foreground">Orders Overview</h3>
        
        <div className="flex-1" />

        {/* Time Range Toggle */}
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

      {/* Category Pie Chart */}
      {categoryPieData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Category Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <ChartContainer config={chartConfig} className="h-[250px] w-full md:w-1/2">
                <PieChart>
                  <Pie
                    data={categoryPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ percentage }) => `${percentage}%`}
                    labelLine={false}
                  >
                    {categoryPieData.map((entry) => (
                      <Cell 
                        key={entry.name} 
                        fill={CATEGORY_COLORS[entry.name] || 'hsl(var(--primary))'} 
                      />
                    ))}
                  </Pie>
                  <ChartTooltip 
                    content={<ChartTooltipContent formatter={(value, name) => `${value} orders (${categoryPieData.find(c => c.name === name)?.percentage}%)`} />} 
                  />
                </PieChart>
              </ChartContainer>
              <div className="flex flex-col gap-2 w-full md:w-1/2">
                {categoryPieData.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: CATEGORY_COLORS[entry.name] || 'hsl(var(--primary))' }}
                      />
                      <span className="text-sm text-muted-foreground">{entry.name}</span>
                    </div>
                    <span className="text-sm font-medium text-foreground">{entry.value} ({entry.percentage}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category-wise Orders Stacked Bar Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-medium">Orders by Category</CardTitle>
            <span className="text-sm font-semibold text-primary">Total: {stats.totalOrders}</span>
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
                <Legend />
                {categories.map((category) => (
                  <Bar 
                    key={category}
                    dataKey={category} 
                    stackId="orders"
                    fill={CATEGORY_COLORS[category] || 'hsl(var(--primary))'}
                    radius={categories.indexOf(category) === categories.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    name={category}
                  />
                ))}
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Revenue Area Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-medium">Revenue Trend</CardTitle>
            <span className="text-sm font-semibold text-secondary">Total: ₹{stats.totalRevenue.toLocaleString()}</span>
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
                  tickFormatter={(value) => value >= 1000 ? `₹${(value / 1000).toFixed(0)}k` : `₹${value}`}
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