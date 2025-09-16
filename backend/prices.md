# Music Video Generation Pricing

This document explains how prices are calculated for music video generation based on the selected options and track durations.

## Base Rates (from prices.json)

- **Credits Rate**: 20 credits per dollar
- **Music Generator**: $0.50 per track
- **Image Generator**: $0.10 per minute + $0.10 per unit (min: $3, max: $3)
- **Looped Animation Generator**: $0.11 per minute + $0.11 per unit (min: $5, max: $60)
- **Video Generator**: $30 per minute (min: $5, no max)

## Calculation Logic

### Static Image or Looped Animation

**Formula:**
```
Price = (Number of Images/Animations × Unit Rate) + (Total Duration × Minute Rate)
Final Price = max(Calculated Price, Minimum Price)
```

**Number of Images/Animations:**
- If "Reuse videoclip" is selected: 1 (regardless of number of music tracks)
- If "Reuse videoclip" is NOT selected: Number of individual music tracks

**Total Duration:**
- Sum of all music track durations in minutes

**Example:**
- 3 music tracks, 2 minutes each (6 minutes total)
- Reuse videoclip: OFF
- Looped Animation selected
- Calculation: (3 × $0.11) + (6 × $0.11) = $0.33 + $0.66 = $0.99
- Final Price: max($0.99, $5.00) = $5.00

### Video Generation

**Formula:**
```
Duration = Reuse videoclip ? Longest Track Duration : Total Duration
Price = Duration × Minute Rate
Final Price = max(Calculated Price, Minimum Price)
```

**Duration Logic:**
- If "Reuse videoclip" is selected: Use duration of the longest individual track
- If "Reuse videoclip" is NOT selected: Use total duration of all tracks combined

**Example:**
- 3 music tracks: 2min, 3min, 1min (6 minutes total)
- Reuse videoclip: ON
- Video Generation selected
- Duration used: 3 minutes (longest track)
- Calculation: 3 × $30 = $90
- Final Price: max($90, $5) = $90

## Special Cases

1. **Minimum Pricing**: All calculations respect the minimum price requirements
2. **Maximum Pricing**: Only applies to looped animations ($60 max)
3. **Reuse Logic**: When "Reuse videoclip" is selected, only one visual asset is generated regardless of track count
4. **Duration Handling**: All durations are converted to minutes for calculation

## Implementation Notes

- Prices are calculated in real-time as users change settings
- The budget slider reflects the calculated price
- Users can override the calculated price if needed
- All prices are displayed in dollars and converted to credits using the credits_rate
