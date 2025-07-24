import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Briefcase } from "lucide-react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import OperatorTypeGrid from "@/components/OperatorTypeGrid"; // If this is not a component, inline the grid code
import PlatformFeatureMenu from "@/components/PlatformFeatureMenu"; // If not a component, remove
import { useState } from "react";

export default function WhatWeOfferPage() {
  // You may need to copy the operatorTypes and modal logic if not imported
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-12">
      <Card className="bg-white rounded-2xl shadow-lg p-8 max-w-4xl w-full">
        <div className="text-center mb-4">
          <Badge variant="secondary" className="mb-4">
            What We Offer
          </Badge>
        </div>
        <h2 className="text-4xl lg:text-5xl font-bold text-center text-gray-900 mb-6">
          COMPREHENSIVE CREATIVE SOLUTIONS
        </h2>
        <p className="text-xl text-gray-600 text-center max-w-3xl mx-auto mb-16">
          Our comprehensive services encompass creative project management, skilled operator networks, and premium
          marketplace solutions.
        </p>
        {/* Feature 1: Client Platform */}
        <div className="space-y-8">
          <Dialog>
            <DialogTrigger asChild>
              <div className="flex items-start space-x-4 cursor-pointer hover:bg-gray-50 rounded-lg p-2 transition">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Client Platform</h3>
                  <p className="text-gray-600">
                    Custom dashboards, project management, and automated website generation with integrated
                    storefronts and content publishing.
                  </p>
                </div>
              </div>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Client Platform</DialogTitle>
                <DialogDescription>Feature details coming soon...</DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
          {/* Feature 2: Operator Network */}
          <Dialog>
            <DialogTrigger asChild>
              <div className="flex items-start space-x-4 cursor-pointer hover:bg-gray-50 rounded-lg p-2 transition">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Briefcase className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Operator Network</h3>
                  <p className="text-gray-600">
                    Connect with verified creative professionals across design, development, marketing, audio,
                    video, and consulting services.
                  </p>
                </div>
              </div>
            </DialogTrigger>
            <DialogContent fullscreen>
              <DialogHeader>
                <DialogTitle>Operator Network</DialogTitle>
                <DialogDescription>Browse and connect with operator types below.</DialogDescription>
              </DialogHeader>
              {/* OperatorTypeGrid and modal logic can be added here if needed */}
            </DialogContent>
          </Dialog>
        </div>
      </Card>
    </div>
  );
} 