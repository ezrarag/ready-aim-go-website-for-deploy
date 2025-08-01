import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Percent, TrendingUp, TrendingDown, Save, X } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface CommissionRateModalProps {
  open: boolean;
  onClose: () => void;
  currentRate: number;
  onRateChange: (rate: number) => void;
}

export function CommissionRateModal({ open, onClose, currentRate, onRateChange }: CommissionRateModalProps) {
  const [tempRate, setTempRate] = useState(currentRate);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('Error getting user:', userError);
        throw new Error('User not authenticated');
      }

      // Save to Supabase profiles table
      const { error } = await supabase
        .from('profiles')
        .update({ commission_rate: tempRate })
        .eq('id', user.id);
      
      if (error) {
        // If column doesn't exist yet, just update locally
        if (error.code === '42703') {
          console.log('Commission rate column not found, updating locally only');
        } else {
          console.error('Error saving commission rate:', error);
          throw error;
        }
      }
      
      // Update the rate and close modal
      onRateChange(tempRate);
      onClose();
    } catch (error) {
      console.error('Error saving commission rate:', error);
      // Still close the modal even if save fails
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setTempRate(currentRate);
    onClose();
  };

  const getRateColor = (rate: number) => {
    if (rate >= 5) return 'text-red-500';
    if (rate >= 3) return 'text-orange-500';
    return 'text-green-500';
  };

  const getRateDescription = (rate: number) => {
    if (rate >= 5) return 'High commission rate';
    if (rate >= 3) return 'Moderate commission rate';
    return 'Low commission rate';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-neutral-900 border-neutral-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Percent className="w-6 h-6 text-orange-500" />
            Commission Rate Settings
          </DialogTitle>
          <DialogDescription className="text-neutral-400">
            Adjust your commission rate for revenue sharing. Higher rates mean more revenue but may affect client retention.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Rate Display */}
          <Card className="bg-neutral-800 border-neutral-600">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-2">
                  {tempRate.toFixed(1)}%
                </div>
                <div className={`text-sm ${getRateColor(tempRate)}`}>
                  {getRateDescription(tempRate)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Slider */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium text-neutral-300">
                Commission Rate
              </Label>
              <div className="text-sm text-neutral-400">
                {tempRate.toFixed(1)}%
              </div>
            </div>
            
            <Slider
              value={[tempRate]}
              onValueChange={(value) => setTempRate(value[0])}
              max={7}
              min={0.2}
              step={0.1}
              className="w-full"
            />
            
            <div className="flex justify-between text-xs text-neutral-500">
              <span>0.2%</span>
              <span>7%</span>
            </div>
          </div>

          {/* Rate Impact Preview */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-neutral-300">Revenue Impact Preview</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-neutral-800 border border-neutral-600 rounded p-3">
                <div className="text-neutral-400 mb-1">$1,000 Revenue</div>
                <div className="text-white font-mono">
                  ${(1000 * (tempRate / 100)).toFixed(2)} commission
                </div>
              </div>
              <div className="bg-neutral-800 border border-neutral-600 rounded p-3">
                <div className="text-neutral-400 mb-1">$5,000 Revenue</div>
                <div className="text-white font-mono">
                  ${(5000 * (tempRate / 100)).toFixed(2)} commission
                </div>
              </div>
            </div>
          </div>

          {/* Rate Comparison */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-neutral-300">Rate Comparison</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-400">Current Rate:</span>
                <span className="text-white">{currentRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">New Rate:</span>
                <span className={`${tempRate > currentRate ? 'text-green-500' : tempRate < currentRate ? 'text-red-500' : 'text-white'}`}>
                  {tempRate.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Change:</span>
                <span className={`${tempRate > currentRate ? 'text-green-500' : tempRate < currentRate ? 'text-red-500' : 'text-white'}`}>
                  {tempRate > currentRate ? '+' : ''}{(tempRate - currentRate).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1 bg-transparent border-neutral-600 text-neutral-300 hover:bg-neutral-800"
              disabled={isSaving}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
              disabled={isSaving || tempRate === currentRate}
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 