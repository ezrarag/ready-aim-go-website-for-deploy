# Google Maps Integration Setup

This guide explains how to integrate Google Maps into the project map component.

## 🗺️ Features

- **Real Google Maps**: Full Google Maps integration with custom styling
- **Interactive Markers**: Clickable markers with project information
- **Custom Styling**: Styled to match the existing design
- **Fallback Support**: Falls back to custom map if Google Maps fails to load
- **Toggle Option**: Users can switch between custom and Google Maps

## 🚀 Quick Setup

### 1. Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Maps JavaScript API**
4. Go to **Credentials** and create an **API Key**
5. Restrict the API key to your domain for security

### 2. Add Environment Variable

Create or update your `.env.local` file:

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### 3. Install Dependencies

The required dependency is already added to `package.json`:

```bash
npm install @googlemaps/js-api-loader
# or
pnpm install @googlemaps/js-api-loader
```

## 🎨 Implementation Details

### Component Structure

```
components/
├── google-maps.tsx          # Google Maps component
└── ...

app/
├── page.tsx                 # Updated ProjectMap with toggle
└── ...

types/
└── google-maps.d.ts         # TypeScript declarations
```

### Key Features

1. **Custom Styling**: Maps are styled to match the existing design with a clean, modern look
2. **Interactive Markers**: Purple markers with project counts and hover effects
3. **Info Windows**: Click markers to see project details
4. **Responsive Design**: Works on all screen sizes
5. **Error Handling**: Graceful fallback if Google Maps fails to load
6. **Performance**: Lazy loading and efficient marker management

### Usage

The `ProjectMap` component now supports both custom and Google Maps:

```tsx
// Automatic toggle between custom and Google Maps
<ProjectMap projects={projects} onSelect={handleProjectSelect} />
```

### Customization Options

#### Map Styling

You can customize the map appearance by modifying the `styles` array in `google-maps.tsx`:

```tsx
const mapStyles = [
  {
    featureType: "all",
    elementType: "geometry",
    stylers: [{ color: "#f5f5f5" }]
  },
  // ... more styles
];
```

#### Marker Icons

Customize marker appearance by modifying the SVG in the `icon` property:

```tsx
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
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API key | Yes |

### API Key Restrictions

For security, restrict your API key to:

1. **HTTP referrers**: Your domain (e.g., `https://yourdomain.com/*`)
2. **API restrictions**: Maps JavaScript API only

### Billing Setup

Google Maps requires billing to be enabled:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **Billing**
4. Enable billing for your project

**Note**: Google Maps has a generous free tier (typically $200/month credit).

## 🎯 Benefits

### User Experience
- **Familiar Interface**: Users recognize Google Maps immediately
- **Interactive**: Zoom, pan, and explore locations
- **Real Data**: Actual geographic coordinates and locations
- **Professional**: High-quality map tiles and satellite imagery

### Developer Experience
- **Type Safety**: Full TypeScript support
- **Error Handling**: Graceful fallbacks
- **Performance**: Optimized loading and rendering
- **Maintainable**: Clean, modular code structure

### Business Benefits
- **Trust**: Google Maps is trusted by users worldwide
- **Accuracy**: Real geographic data and coordinates
- **Scalability**: Handles large datasets efficiently
- **Integration**: Easy to extend with additional features

## 🚨 Troubleshooting

### Common Issues

1. **"Failed to load Google Maps"**
   - Check if API key is set correctly
   - Verify API key restrictions
   - Ensure billing is enabled

2. **"API key not valid"**
   - Check API key format
   - Verify domain restrictions
   - Ensure Maps JavaScript API is enabled

3. **Markers not showing**
   - Check location data format
   - Verify latitude/longitude values
   - Check console for errors

### Debug Mode

Enable debug logging by adding to your environment:

```bash
NEXT_PUBLIC_DEBUG_MAPS=true
```

## 🔄 Migration from Custom Map

The integration is designed to be backward compatible:

1. **Automatic Fallback**: If Google Maps fails, custom map is used
2. **Toggle Option**: Users can switch between map types
3. **Same Data**: Both maps use the same location data
4. **Consistent Styling**: Both maps match the existing design

## 📈 Future Enhancements

Potential improvements:

1. **Clustering**: Group nearby markers for better performance
2. **Heatmaps**: Show project density across regions
3. **Directions**: Show routes between project locations
4. **Street View**: Integrate Street View for locations
5. **Real-time Updates**: Live updates for project locations

## 🤝 Support

For issues or questions:

1. Check the troubleshooting section above
2. Review Google Maps documentation
3. Check browser console for errors
4. Verify API key and billing setup 