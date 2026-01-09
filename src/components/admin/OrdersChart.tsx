import { useState, useMemo } from 'react';
import { format, subDays, subWeeks, subMonths, startOfDay, startOfWeek, startOfMonth, isSameDay, isSameWeek, isSameMonth, isWithinInterval, isAfter, isBefore, startOfToday } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area, LabelList } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, ShoppingCart, IndianRupee, CalendarIcon, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Order } from '@/hooks/useOrders';
import type { DateRange } from 'react-day-picker';

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

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'notes', label: 'Notes' },
  { value: 'mock-papers', label: 'Mock Papers' },
  { value: 'pune-university', label: 'Pune University' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'iit', label: 'IIT' },
  { value: 'others', label: 'Others' },
];

export default function OrdersChart({ orders }: OrdersChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('daily');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [category, setCategory] = useState<string>('all');

  // Filter orders by date range and category
  const filteredOrders = useMemo(() => {
    let result = orders;

    // Filter by date range
    if (dateRange?.from) {
      result = result.filter(o => {
        if (!o.created_at) return false;
        const orderDate = new Date(o.created_at);
        if (dateRange.to) {
          return isWithinInterval(orderDate, { start: startOfDay(dateRange.from!), end: startOfDay(dateRange.to) });
        }
        return isAfter(orderDate, startOfDay(dateRange.from!)) || isSameDay(orderDate, dateRange.from!);
      });
    }

    return result;
  }, [orders, dateRange]);

  const chartData = useMemo(() => {
    const now = new Date();
    let data: { label: string; orders: number; revenue: number; date: Date }[] = [];

    // Determine date range for chart based on filter or default
    const endDate = dateRange?.to || now;
    const startDate = dateRange?.from || (
      timeRange === 'daily' ? subDays(now, 13) :
      timeRange === 'weekly' ? subWeeks(now, 7) :
      subMonths(now, 5)
    );

    if (timeRange === 'daily') {
      // Calculate days between start and end
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const daysToShow = Math.min(daysDiff, 30); // Max 30 days
      
      for (let i = daysToShow - 1; i >= 0; i--) {
        const date = subDays(endDate, i);
        const dayStart = startOfDay(date);
        const dayOrders = filteredOrders.filter(o => 
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
      const weeksDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1;
      const weeksToShow = Math.min(weeksDiff, 12); // Max 12 weeks
      
      for (let i = weeksToShow - 1; i >= 0; i--) {
        const date = subWeeks(endDate, i);
        const weekStart = startOfWeek(date, { weekStartsOn: 1 });
        const weekOrders = filteredOrders.filter(o => 
          o.created_at && isSameWeek(new Date(o.created_at), weekStart, { weekStartsOn: 1 })
        );
        const paidOrders = weekOrders.filter(o => o.status === 'paid' || o.status === 'completed');
        
        data.push({
          label: `${format(weekStart, 'MMM d')}`,
          orders: weekOrders.length,
          revenue: paidOrders.reduce((sum, o) => sum + Number(o.total_amount), 0),
          date: weekStart,
        });
      }
    } else {
      const monthsDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)) + 1;
      const monthsToShow = Math.min(monthsDiff, 12); // Max 12 months
      
      for (let i = monthsToShow - 1; i >= 0; i--) {
        const date = subMonths(endDate, i);
        const monthStart = startOfMonth(date);
        const monthOrders = filteredOrders.filter(o => 
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
  }, [filteredOrders, timeRange, dateRange]);

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

  const clearFilters = () => {
    setDateRange(undefined);
    setCategory('all');
  };

  const hasFilters = dateRange?.from || category !== 'all';

  return (
    <div className="space-y-6">
      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-4">
        <h3 className="text-lg font-semibold text-foreground">Orders Overview</h3>
        
        <div className="flex-1" />

        {/* Category Filter */}
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date Range Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[280px] justify-start text-left font-normal",
                !dateRange?.from && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
              disabled={(date) => isAfter(date, startOfToday())}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

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

        {/* Clear Filters */}
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-medium">Orders Trend</CardTitle>
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
                <Bar 
                  dataKey="orders" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                  name="Orders"
                >
                  <LabelList 
                    dataKey="orders" 
                    position="top" 
                    className="fill-foreground text-xs font-medium"
                    formatter={(value: number) => value > 0 ? value : ''}
                  />
                </Bar>
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
