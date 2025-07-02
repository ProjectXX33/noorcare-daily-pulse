import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { User } from '@/types';
import { Button } from '@/components/ui/button';

interface WarehouseStats {
  userId: string;
  name: string;
  email: string;
  ordersProcessed: number;
  ordersShipped: number;
  ordersDelivered: number;
}

const AdminWarehousePage: React.FC = () => {
  const [warehouseUsers, setWarehouseUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<WarehouseStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWarehouseUsers = async () => {
      setLoading(true);
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'warehouse');
      if (error) return setLoading(false);
      setWarehouseUsers(users || []);
      setLoading(false);
    };
    fetchWarehouseUsers();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      if (warehouseUsers.length === 0) return;
      const statsArr: WarehouseStats[] = [];
      for (const user of warehouseUsers) {
        // Orders processed: all orders where shipped_by = user.id
        const { data: shippedOrders, error: shippedError } = await supabase
          .from('order_submissions')
          .select('id, status')
          .eq('shipped_by', user.id);
        if (shippedError) continue;
        const ordersShipped = shippedOrders.length;
        const ordersDelivered = shippedOrders.filter((o: any) => o.status === 'delivered').length;
        statsArr.push({
          userId: user.id,
          name: user.name,
          email: user.email,
          ordersProcessed: shippedOrders.length,
          ordersShipped,
          ordersDelivered
        });
      }
      setStats(statsArr);
    };
    fetchStats();
  }, [warehouseUsers]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <Card>
        <CardHeader>
          <CardTitle>Warehouse Staff Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Orders Processed</TableHead>
                <TableHead>Orders Shipped</TableHead>
                <TableHead>Orders Delivered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.map((stat) => (
                <TableRow key={stat.userId}>
                  <TableCell>{stat.name}</TableCell>
                  <TableCell>{stat.email}</TableCell>
                  <TableCell>
                    <Badge>{stat.ordersProcessed}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge>{stat.ordersShipped}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge>{stat.ordersDelivered}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {stats.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500">No warehouse staff found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminWarehousePage; 