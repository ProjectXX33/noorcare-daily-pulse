import { useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { format, differenceInMinutes } from 'date-fns';
import wooCommerceAPI from '@/lib/woocommerceApi';

export const useAutoSync = () => {
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncRef = useRef<number>(0);

  // Auto WooCommerce sync every 2 minutes
  const startAutoWooCommerceSync = () => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
    }

    const syncFromWooCommerce = async () => {
      try {
        const now = Date.now();
        // Prevent too frequent syncs (minimum 1 minute between syncs)
        if (now - lastSyncRef.current < 60000) {
          return;
        }
        lastSyncRef.current = now;

        console.log('🔄 Auto-syncing from WooCommerce...');
        
        // Get orders modified in the last 2 hours
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
        
        const wooOrders = await wooCommerceAPI.fetchOrders({
          modified_after: twoHoursAgo,
          per_page: 50,
          status: 'any'
        });

        if (!wooOrders || wooOrders.length === 0) {
          console.log('📦 No recent WooCommerce orders to sync');
          return;
        }

        // Get existing orders from our database
        const { data: localOrders, error } = await supabase
          .from('order_submissions')
          .select('id, woocommerce_order_id, status, woocommerce_status')
          .not('woocommerce_order_id', 'is', null);

        if (error) {
          console.error('Error fetching local orders:', error);
          return;
        }

        const localStatusMap = new Map(
          localOrders?.map(order => [order.woocommerce_order_id, order]) || []
        );

        let syncedCount = 0;
        const promises: Promise<any>[] = [];

        // Compare and update statuses
        for (const wooOrder of wooOrders) {
          const localOrder = localStatusMap.get(wooOrder.id);
          
          const wooStatusMap: { [key: string]: string } = {
            'pending': 'pending', 'processing': 'processing', 'on-hold': 'on-hold',
            'shipped': 'shipped', 'completed': 'delivered', 'cancelled': 'cancelled', 'refunded': 'refunded'
          };
          const newLocalStatus = wooStatusMap[wooOrder.status] || wooOrder.status;

          if (localOrder && localOrder.status !== newLocalStatus) {
            console.log(`💡 Auto-sync: Status mismatch for order #${wooOrder.number}. Updating ${localOrder.status} → ${newLocalStatus}`);
            
            const updatePromise = supabase
              .from('order_submissions')
              .update({ 
                status: newLocalStatus, 
                woocommerce_status: wooOrder.status,
                last_sync_attempt: new Date().toISOString() 
              })
              .eq('id', localOrder.id)
              .then(({ error: updateError }) => {
                if (!updateError) {
                  syncedCount++;
                }
              });
            promises.push(Promise.resolve(updatePromise));
          } else if (localOrder) {
            // Update WooCommerce status and sync timestamp even if local status is the same
            const updatePromise = supabase
              .from('order_submissions')
              .update({ 
                woocommerce_status: wooOrder.status,
                last_sync_attempt: new Date().toISOString() 
              })
              .eq('id', localOrder.id)
              .then(({ error: updateError }) => {
                if (!updateError) {
                  // No status change, but we still updated the WooCommerce status & timestamp
                  syncedCount++;
                }
              });
            promises.push(Promise.resolve(updatePromise));
          }
        }

        await Promise.all(promises);

        if (syncedCount > 0) {
          console.log(`✅ Auto-sync completed: ${syncedCount} orders updated`);
        }

      } catch (error) {
        console.error('❌ Auto WooCommerce sync error:', error);
      }
    };

    // Run sync immediately, then every 2 minutes
    syncFromWooCommerce();
    syncIntervalRef.current = setInterval(syncFromWooCommerce, 2 * 60 * 1000);
  };

  const stopAutoSync = () => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
  };

  useEffect(() => {
    startAutoWooCommerceSync();

    return () => {
      stopAutoSync();
    };
  }, []);

  return {
    startAutoWooCommerceSync,
    stopAutoSync
  };
};

export const useAutoShiftsCalculation = () => {
  const { user } = useAuth();
  const lastAutoCalculation = useRef<Date | null>(null);
  const isCalculatingRef = useRef(false);

  const performAutoCalculation = useCallback(async (silent = true) => {
    // Only allow admins to perform auto calculations
    if (user?.role !== 'admin' || isCalculatingRef.current) {
      return { success: false, message: 'Not authorized or already calculating' };
    }

    // Prevent concurrent calculations
    isCalculatingRef.current = true;

    try {
      if (!silent) {
        console.log('🔄 Starting automatic shifts calculation...');
        toast.info('Starting automatic shifts calculation...');
      }

      // Get today's date for filtering recent records
      const today = new Date();
      const recentDate = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000)); // Last 7 days

      // Fetch recent monthly shift records that need recalculation
      const { data: monthlyShifts, error: fetchError } = await supabase
        .from('monthly_shifts')
        .select(`
          *,
          shifts:shift_id(*),
          users:user_id(name)
        `)
        .not('check_in_time', 'is', null)
        .not('check_out_time', 'is', null)
        .gte('work_date', format(recentDate, 'yyyy-MM-dd'))
        .order('work_date', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      if (!monthlyShifts || monthlyShifts.length === 0) {
        if (!silent) {
          toast.info('No recent shift records found to calculate');
        }
        return { success: true, message: 'No records to process', recordsProcessed: 0 };
      }

      // Fetch break time data for these records
      const { data: breakTimeData, error: breakTimeError } = await supabase
        .from('check_ins')
        .select('user_id, timestamp, total_break_minutes, break_sessions')
        .gte('timestamp', format(recentDate, 'yyyy-MM-dd') + 'T00:00:00')
        .order('timestamp', { ascending: false });

      if (breakTimeError) {
        console.warn('⚠️ Could not fetch break time data:', breakTimeError);
      }

      // Create a map of break time data by user and date
      const breakTimeMap = new Map();
      if (breakTimeData) {
        breakTimeData.forEach(item => {
          const dateKey = format(new Date(item.timestamp), 'yyyy-MM-dd');
          const key = `${item.user_id}-${dateKey}`;
          if (!breakTimeMap.has(key) || (breakTimeMap.get(key).totalBreakMinutes || 0) < (item.total_break_minutes || 0)) {
            breakTimeMap.set(key, {
              totalBreakMinutes: item.total_break_minutes || 0,
              breakSessions: item.break_sessions || []
            });
          }
        });
      }

      let updated = 0;
      let errors = 0;
      const recordsNeedingUpdate = [];

      // Process each record and check if it needs updating
      for (const record of monthlyShifts) {
        try {
          const checkInTime = new Date(record.check_in_time);
          const checkOutTime = record.check_out_time ? new Date(record.check_out_time) : null;
          const shift = record.shifts;

          if (!shift || !checkOutTime) {
            continue;
          }

          // Get break time data for this record
          const dateKey = format(new Date(record.work_date), 'yyyy-MM-dd');
          const breakKey = `${record.user_id}-${dateKey}`;
          const breakData = breakTimeMap.get(breakKey) || { totalBreakMinutes: 0, breakSessions: [] };
          const breakTimeMinutes = breakData.totalBreakMinutes || 0;

          // Calculate what the values should be
          const totalMinutes = differenceInMinutes(checkOutTime, checkInTime);
          const actualWorkMinutes = totalMinutes - breakTimeMinutes;
          const actualWorkHours = actualWorkMinutes / 60;

          // Determine standard work hours
          let standardWorkHours = 8;
          if (shift.name.toLowerCase().includes('day')) {
            standardWorkHours = 7;
          } else if (!shift.name.toLowerCase().includes('night')) {
            try {
              const [startHour, startMin] = shift.start_time.split(':').map(Number);
              const [endHour, endMin] = shift.end_time.split(':').map(Number);
              
              let durationMinutes;
              if (endHour < startHour || (endHour === startHour && endMin < startMin)) {
                durationMinutes = (24 * 60 - (startHour * 60 + startMin)) + (endHour * 60 + endMin);
              } else {
                durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
              }
              
              standardWorkHours = durationMinutes / 60;
            } catch (e) {
              standardWorkHours = 8;
            }
          }

          // Calculate what values should be - with all-time overtime support
          let newRegularHours, newOvertimeHours;
          
          if (shift.all_time_overtime) {
            // All time is overtime for this shift
            newRegularHours = 0;
            newOvertimeHours = actualWorkHours;
          } else {
            // Normal calculation
            newRegularHours = Math.max(0, Math.min(actualWorkHours, standardWorkHours));
            newOvertimeHours = Math.max(0, actualWorkHours - standardWorkHours);
          }
          
          let newDelayMinutes = 0;
          if (shift.all_time_overtime) {
            // No delay for all-time overtime shifts
            newDelayMinutes = 0;
          } else {
            // Normal delay calculation
            if (actualWorkHours < standardWorkHours) {
              const hoursShort = standardWorkHours - actualWorkHours;
              newDelayMinutes = hoursShort * 60;
            }
          }

          // Check if values need updating (with a small tolerance for floating point precision)
          const tolerance = 0.01;
          const regularNeedsUpdate = Math.abs(newRegularHours - (record.regular_hours || 0)) > tolerance;
          const overtimeNeedsUpdate = Math.abs(newOvertimeHours - (record.overtime_hours || 0)) > tolerance;
          const delayNeedsUpdate = Math.abs(newDelayMinutes - (record.delay_minutes || 0)) > tolerance;

          if (regularNeedsUpdate || overtimeNeedsUpdate || delayNeedsUpdate) {
            recordsNeedingUpdate.push({
              id: record.id,
              regular_hours: Math.round(newRegularHours * 100) / 100,
              overtime_hours: Math.round(newOvertimeHours * 100) / 100,
              delay_minutes: Math.round(newDelayMinutes * 100) / 100,
              updated_at: new Date().toISOString()
            });
          }

        } catch (recordError) {
          console.error(`❌ Error processing record ${record.id}:`, recordError);
          errors++;
        }
      }

      // Only update records that actually need updating
      if (recordsNeedingUpdate.length > 0) {
        for (const updateData of recordsNeedingUpdate) {
          try {
            const { error: updateError } = await supabase
              .from('monthly_shifts')
              .update({
                regular_hours: updateData.regular_hours,
                overtime_hours: updateData.overtime_hours,
                delay_minutes: updateData.delay_minutes,
                updated_at: updateData.updated_at
              })
              .eq('id', updateData.id);

            if (updateError) {
              console.error(`❌ Failed to update record ${updateData.id}:`, updateError);
              errors++;
            } else {
              updated++;
            }
          } catch (updateRecordError) {
            console.error(`❌ Error updating record ${updateData.id}:`, updateRecordError);
            errors++;
          }
        }

        if (!silent) {
          if (errors === 0) {
            toast.success(`✅ Auto-calculated ${updated} shift records`, {
              duration: 3000,
            });
          } else {
            toast.warning(`⚠️ Auto-calculated ${updated} records with ${errors} errors`, {
              duration: 5000,
            });
          }
        }
      }

      lastAutoCalculation.current = new Date();

      return {
        success: true,
        message: 'Auto calculation completed',
        recordsProcessed: monthlyShifts.length,
        recordsUpdated: updated,
        errors
      };

    } catch (error) {
      console.error('❌ Auto shifts calculation failed:', error);
      if (!silent) {
        toast.error(`Auto calculation failed: ${error.message}`, {
          duration: 8000,
        });
      }
      return {
        success: false,
        message: error.message,
        recordsProcessed: 0,
        recordsUpdated: 0,
        errors: 1
      };
    } finally {
      isCalculatingRef.current = false;
    }
  }, [user]);

      // Auto-calculate on mount and periodically (only for admins)
  useEffect(() => {
    if (user?.role !== 'admin') return;

    // Run initial calculation (silent)
    performAutoCalculation(true);

    // Set up frequent automatic calculation every 5 minutes
    const interval = setInterval(() => {
      performAutoCalculation(true);
    }, 5 * 60 * 1000); // 5 minutes - much more frequent

    return () => clearInterval(interval);
  }, [user, performAutoCalculation]);

  return {
    performAutoCalculation,
    lastAutoCalculation: lastAutoCalculation.current,
    isCalculating: isCalculatingRef.current
  };
}; 