"use client";

import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface Location {
  id: number;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  projectCount: number;
  projects?: any[];
}

interface GoogleMapsProps {
  locations: Location[];
  onLocationClick?: (location: Location) => void;
  height?: string;
  className?: string;
}

export function GoogleMaps({ locations, onLocationClick, height = "600px", className = "" }: GoogleMapsProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initMap = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load Google Maps API
        const loader = new Loader({
          apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
          version: 'weekly',
          libraries: ['places']
        });

        const google = await loader.load();
        
        if (!mapRef.current) return;

        // Create map instance
        const mapInstance = new google.maps.Map(mapRef.current, {
          center: { lat: 20, lng: 0 }, // Center of the world
          zoom: 2,
          styles: [
            {
              featureType: "all",
              elementType: "geometry",
              stylers: [{ color: "#f5f5f5" }]
            },
            {
              featureType: "water",
              elementType: "geometry",
              stylers: [{ color: "#e9e9e9" }]
            },
            {
              featureType: "landscape",
              elementType: "geometry",
              stylers: [{ color: "#f5f5f5" }]
            },
            {
              featureType: "road",
              elementType: "geometry",
              stylers: [{ color: "#ffffff" }]
            },
            {
              featureType: "poi",
              elementType: "geometry",
              stylers: [{ color: "#f5f5f5" }]
            },
            {
              featureType: "transit",
              elementType: "geometry",
              stylers: [{ color: "#f5f5f5" }]
            },
            {
              featureType: "administrative",
              elementType: "geometry.stroke",
              stylers: [{ color: "#bdbdbd" }]
            },
            {
              featureType: "administrative.land_parcel",
              elementType: "geometry.stroke",
              stylers: [{ color: "#bdbdbd" }]
            },
            {
              featureType: "road.highway",
              elementType: "geometry",
              stylers: [{ color: "#ffffff" }]
            },
            {
              featureType: "road.highway",
              elementType: "geometry.stroke",
              stylers: [{ color: "#bdbdbd" }]
            },
            {
              featureType: "road.arterial",
              elementType: "geometry",
              stylers: [{ color: "#ffffff" }]
            },
            {
              featureType: "road.arterial",
              elementType: "geometry.stroke",
              stylers: [{ color: "#bdbdbd" }]
            },
            {
              featureType: "road.local",
              elementType: "geometry",
              stylers: [{ color: "#ffffff" }]
            },
            {
              featureType: "road.local",
              elementType: "geometry.stroke",
              stylers: [{ color: "#bdbdbd" }]
            },
            {
              featureType: "poi",
              elementType: "labels.text.fill",
              stylers: [{ color: "#757575" }]
            },
            {
              featureType: "poi",
              elementType: "labels.text.stroke",
              stylers: [{ color: "#ffffff" }]
            },
            {
              featureType: "poi",
              elementType: "labels.icon",
              stylers: [{ visibility: "off" }]
            },
            {
              featureType: "transit",
              elementType: "labels.text.fill",
              stylers: [{ color: "#757575" }]
            },
            {
              featureType: "transit",
              elementType: "labels.text.stroke",
              stylers: [{ color: "#ffffff" }]
            },
            {
              featureType: "transit",
              elementType: "labels.icon",
              stylers: [{ visibility: "off" }]
            },
            {
              featureType: "landscape",
              elementType: "labels.text.fill",
              stylers: [{ color: "#757575" }]
            },
            {
              featureType: "landscape",
              elementType: "labels.text.stroke",
              stylers: [{ color: "#ffffff" }]
            },
            {
              featureType: "landscape",
              elementType: "labels.icon",
              stylers: [{ visibility: "off" }]
            },
            {
              featureType: "road",
              elementType: "labels.text.fill",
              stylers: [{ color: "#757575" }]
            },
            {
              featureType: "road",
              elementType: "labels.text.stroke",
              stylers: [{ color: "#ffffff" }]
            },
            {
              featureType: "road",
              elementType: "labels.icon",
              stylers: [{ visibility: "off" }]
            },
            {
              featureType: "administrative",
              elementType: "labels.text.fill",
              stylers: [{ color: "#757575" }]
            },
            {
              featureType: "administrative",
              elementType: "labels.text.stroke",
              stylers: [{ color: "#ffffff" }]
            },
            {
              featureType: "administrative",
              elementType: "labels.icon",
              stylers: [{ visibility: "off" }]
            }
          ],
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          scaleControl: true,
          streetViewControl: false,
          rotateControl: false,
          fullscreenControl: false
        });

        setMap(mapInstance);

        // Create markers for each location
        const newMarkers: google.maps.Marker[] = [];
        
        locations.forEach((location) => {
          const marker = new google.maps.Marker({
            position: { lat: location.latitude, lng: location.longitude },
            map: mapInstance,
            title: `${location.city}, ${location.country}`,
            icon: {
              url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="20" cy="20" r="8" fill="#8b5cf6" stroke="#ffffff" stroke-width="2"/>
                  <circle cx="20" cy="20" r="12" fill="none" stroke="#8b5cf6" stroke-width="2" opacity="0.3"/>
                  <text x="20" y="24" text-anchor="middle" fill="white" font-family="Arial" font-size="10" font-weight="bold">${location.projectCount}</text>
                </svg>
              `)}`,
              scaledSize: new google.maps.Size(40, 40),
              anchor: new google.maps.Point(20, 20)
            }
          });

          // Create info window
          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div class="p-3 max-w-xs">
                <div class="font-semibold text-purple-600">${location.city}</div>
                <div class="text-gray-600">${location.projectCount} active projects</div>
                <div class="text-xs text-gray-500 mt-1">${location.country}</div>
              </div>
            `
          });

          // Add click listener
          marker.addListener('click', () => {
            infoWindow.open(mapInstance, marker);
            if (onLocationClick) {
              onLocationClick(location);
            }
          });

          newMarkers.push(marker);
        });

        setMarkers(newMarkers);
        setLoading(false);

      } catch (err) {
        console.error('Error loading Google Maps:', err);
        setError('Failed to load Google Maps');
        setLoading(false);
      }
    };

    if (locations.length > 0) {
      initMap();
    }
  }, [locations, onLocationClick]);

  // Cleanup markers on unmount
  useEffect(() => {
    return () => {
      markers.forEach(marker => {
        marker.setMap(null);
      });
    };
  }, [markers]);

  if (loading) {
    return (
      <div className={`relative bg-gray-100 rounded-xl overflow-hidden ${className}`} style={{ height }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Google Maps...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`relative bg-gray-100 rounded-xl overflow-hidden ${className}`} style={{ height }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-gray-600">Failed to load Google Maps</p>
            <p className="text-sm text-gray-500 mt-1">Please check your internet connection</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <div ref={mapRef} className="w-full h-full rounded-xl" />
      
      {/* Custom Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button 
          className="w-10 h-10 bg-white rounded-lg shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
          onClick={() => map?.setZoom((map.getZoom() || 2) + 1)}
        >
          <span className="text-lg">+</span>
        </button>
        <button 
          className="w-10 h-10 bg-white rounded-lg shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
          onClick={() => map?.setZoom((map.getZoom() || 2) - 1)}
        >
          <span className="text-lg">−</span>
        </button>
      </div>
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg px-4 py-3 shadow-lg border border-gray-200">
        <div className="flex items-center gap-3 text-sm text-gray-700">
          <div className="relative">
            <div className="w-4 h-4 bg-purple-600 rounded-full border-2 border-white"></div>
          </div>
          <span className="font-medium">Project Locations</span>
        </div>
      </div>
      
      {/* Stats */}
      <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg px-4 py-3 shadow-lg border border-gray-200">
        <div className="text-sm text-gray-700">
          <div className="font-semibold mb-1">Active Projects</div>
          <div className="grid grid-cols-2 gap-3">
            {locations.slice(0, 4).map((location) => (
              <div key={location.id} className="text-center">
                <div className="text-lg font-bold text-purple-600">{location.projectCount}</div>
                <div className="text-xs text-gray-600">{location.city}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 