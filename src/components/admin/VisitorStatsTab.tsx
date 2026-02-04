import { useEffect, useState } from 'react';
import { format, subDays } from 'date-fns';
import { Users, TrendingUp, Calendar, BarChart3, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface VisitorStats {
  visit_date: string;
  visit_count: number;
}

const VisitorStatsTab = () => {
  const [stats, setStats] = useState<VisitorStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch last 30 days of stats
        const thirtyDaysAgo = subDays(new Date(), 30).toISOString().split('T')[0];
        
        const { data, error: fetchError } = await supabase
          .from('visitor_stats')
          .select('visit_date, visit_count')
          .gte('visit_date', thirtyDaysAgo)
          .order('visit_date', { ascending: true });

        if (fetchError) throw fetchError;

        setStats(data || []);
      } catch (err: any) {
        console.error('[VisitorStatsTab] Error fetching stats:', err);
        setError(err.message || 'Failed to load visitor stats');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Calculate summary stats
  const todayStr = new Date().toISOString().split('T')[0];
  const todayStats = stats.find(s => s.visit_date === todayStr);
  const todayVisits = todayStats?.visit_count || 0;
  
  const totalVisits = stats.reduce((sum, s) => sum + s.visit_count, 0);
  
  const last7Days = stats.slice(-7);
  const weeklyVisits = last7Days.reduce((sum, s) => sum + s.visit_count, 0);
  
  const avgDaily = stats.length > 0 ? Math.round(totalVisits / stats.length) : 0;

  // Format data for chart
  const chartData = stats.map(s => ({
    date: format(new Date(s.visit_date), 'MMM d'),
    visits: s.visit_count,
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today's Visits
            </CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayVisits.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Week
            </CardTitle>
            <Calendar className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weeklyVisits.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total (30 days)
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVisits.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Daily Average
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgDaily.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Visitor Trends (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar 
                    dataKey="visits" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No visitor data yet. Stats will appear as visitors browse the site.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VisitorStatsTab;
